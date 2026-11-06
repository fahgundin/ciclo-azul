import { useEffect, useId, useState, type FormEvent } from 'react';
import type { WaterReadingView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { WaterReadingApi } from '../../core/api/water-reading-api';
import { formatDateUtc, formatLiters } from '../../core/format';

interface ManualReadingHistoryProps {
  api: WaterReadingApi;
  /** Unidade consultada; `null` enquanto nenhuma foi escolhida. */
  unitId: string | null;
  /** Unidades ja conhecidas (sugestoes). */
  units: readonly string[];
  onSelectUnit: (unitId: string) => void;
  /** Muda quando uma leitura nova e registrada, para recarregar a lista. */
  version: number;
}

/**
 * Leituras manuais de uma unidade (R04). O historico da API e por unidade e nao
 * ha cadastro de unidades, entao quem consulta informa a unidade. Datas de leitura
 * manual sao de calendario (meia-noite UTC) e por isso exibidas em UTC.
 */
export function ManualReadingHistory({
  api,
  unitId,
  units,
  onSelectUnit,
  version,
}: ManualReadingHistoryProps): JSX.Element {
  const idPrefix = useId();
  const [draft, setDraft] = useState(unitId ?? '');
  const [readings, setReadings] = useState<WaterReadingView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mantem o campo em sincronia quando a tela escolhe a unidade (ex.: apos registrar).
  useEffect(() => {
    setDraft(unitId ?? '');
  }, [unitId]);

  useEffect(() => {
    if (!unitId) {
      setReadings([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listByUnit(unitId)
      .then((all) => {
        if (!cancelled) {
          setReadings(all.filter((reading) => reading.readingType === 'manual'));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReadings([]);
          setError(err instanceof ApiError ? err.message : 'Falha ao carregar as leituras');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, unitId, version]);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const next = draft.trim();
    if (next) {
      onSelectUnit(next);
    }
  }

  const inputId = `${idPrefix}-unit`;
  const listId = `${idPrefix}-units`;

  return (
    <section className="page__section" aria-labelledby={`${idPrefix}-title`}>
      <h2 id={`${idPrefix}-title`}>Leituras manuais</h2>

      <form className="actions" onSubmit={handleSubmit} aria-label="Consultar leituras manuais">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor={inputId}>Unidade</label>
          <input
            id={inputId}
            className="field__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            list={listId}
            autoComplete="off"
          />
          <datalist id={listId}>
            {units.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </div>
        <button type="submit" className="btn" style={{ alignSelf: 'flex-end' }}>
          Consultar
        </button>
      </form>

      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}

      {!unitId ? (
        <p className="hint">Informe a unidade para ver as leituras manuais registradas.</p>
      ) : loading ? (
        <p className="hint">Carregando…</p>
      ) : (
        <ul className="glass list" aria-label={`Leituras manuais de ${unitId}`}>
          {readings.length === 0 ? (
            <li className="list-empty">Nenhuma leitura manual registrada para esta unidade.</li>
          ) : (
            readings.map((reading) => (
              <li key={`${reading.timestamp}-${reading.valueInLiters}`}>
                <div className="item__title">{formatLiters(reading.valueInLiters)}</div>
                <div className="item__meta">{formatDateUtc(reading.timestamp)}</div>
              </li>
            ))
          )}
        </ul>
      )}
      <p className="hint">
        Leituras não podem ser editadas nem excluídas. A retificação com justificativa depende da
        trilha de auditoria (RNF02), ainda não disponível.
      </p>
    </section>
  );
}
