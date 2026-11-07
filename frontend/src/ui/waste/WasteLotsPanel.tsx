import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WasteLotView, WasteTypeView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { WasteLotApi } from '../../core/api/waste-lot-api';
import type { WasteTypeApi } from '../../core/api/waste-type-api';
import { formatDateUtc, formatNumber } from '../../core/format';
import { Dialog } from '../components/Dialog';
import { useFlash } from '../components/Flash';
import { Icon } from '../components/Icon';
import '../styles/components.css';
import { DisposalForm } from './DisposalForm';

interface WasteLotsPanelProps {
  lotApi: WasteLotApi;
  wasteApi: WasteTypeApi;
  /** Relogio injetavel (testes). */
  now?: () => Date;
}

/**
 * Lotes de residuo com destinacao registrada (R06), sobre a API real.
 *
 * O backend so tem lotes JA destinados (registrar a destinacao cria o lote com
 * status "Destinado"): nao ha lotes pendentes, prazo, nem 2a confirmacao. Ver
 * docs/migracao-frontend.md, "Lacunas do R06".
 */
export function WasteLotsPanel({ lotApi, wasteApi, now }: WasteLotsPanelProps): JSX.Element {
  const flash = useFlash();
  const [lots, setLots] = useState<WasteLotView[]>([]);
  const [types, setTypes] = useState<WasteTypeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [loadedLots, loadedTypes] = await Promise.all([lotApi.list(), wasteApi.list()]);
      setLots(loadedLots);
      setTypes(loadedTypes);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar os lotes');
    } finally {
      setLoading(false);
    }
  }, [lotApi, wasteApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeName = useMemo(() => {
    const names = new Map(types.map((type) => [type.id, type.name]));
    return (id: string): string => names.get(id) ?? 'Tipo de resíduo removido';
  }, [types]);

  const sorted = useMemo(() => [...lots].sort((a, b) => b.date.localeCompare(a.date)), [lots]);

  return (
    <section className="page">
      <h1>Destinação de lotes</h1>

      <div className="actions">
        <button type="button" className="btn btn--primary" onClick={() => setDialogOpen(true)}>
          <Icon name="plus" />
          Registrar destinação
        </button>
      </div>

      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="hint">Carregando…</p>
      ) : sorted.length === 0 ? (
        !error && <p className="list-empty">Nenhum lote com destinação registrada ainda.</p>
      ) : (
        <ul className="glass list" aria-label="Lotes com destinação registrada">
          {sorted.map((lot) => (
            <li key={lot.id}>
              <div className="item__title">{typeName(lot.wasteTypeId)}</div>
              <div className="item__meta">
                Quantidade {formatNumber(lot.quantity)} · {formatDateUtc(lot.date)}
              </div>
              <div className="item__meta">
                {lot.receiverCompany} · {lot.location}
              </div>
              <div className="item__meta">
                Licença {lot.license} · Comprovante: {lot.proofReference}
              </div>
              <span className="tag">
                <Icon name="check" size={14} />
                Destinado
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} title="Registrar destinação" onClose={() => setDialogOpen(false)}>
        <DisposalForm
          api={lotApi}
          wasteTypes={types}
          now={now}
          onRegistered={() => {
            flash('Destinação registrada. O lote consta como Destinado.');
            void load();
          }}
          onClose={() => setDialogOpen(false)}
        />
      </Dialog>
    </section>
  );
}
