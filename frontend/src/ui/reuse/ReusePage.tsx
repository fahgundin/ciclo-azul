import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../core/api/api-error';
import type { WaterReadingApi } from '../../core/api/water-reading-api';
import type { WaterStatusApi } from '../../core/api/water-status-api';
import { PERMISSIONS, can } from '../../core/auth/permissions';
import { formatNumber } from '../../core/format';
import {
  MAX_LAST_READING_AGE_HOURS,
  MIN_HISTORY_HOURS,
  analyzeReuse,
  sumSavings,
  type AppliedStore,
  type Opportunity,
  type UnitHistory,
} from '../../core/reuse/opportunities';
import { toChartPoints } from '../../core/water/consumption';
import { useFlash } from '../components/Flash';
import { Icon } from '../components/Icon';
import '../styles/components.css';
import { useUser } from '../UserContext';

interface ReusePageProps {
  statusApi: Pick<WaterStatusApi, 'list'>;
  readingApi: Pick<WaterReadingApi, 'listByUnit'>;
  /** ADAPTER EM MEMORIA das oportunidades aplicadas (R02). */
  appliedStore: AppliedStore;
  /** Relogio injetavel (testes). */
  now?: () => Date;
}

const ALL_READINGS = Number.POSITIVE_INFINITY;

function OpportunityCard({
  opportunity,
  applied,
  canApply,
  onApply,
}: {
  opportunity: Opportunity;
  applied: boolean;
  canApply: boolean;
  onApply: () => void;
}): JSX.Element {
  return (
    <article
      className="glass opportunity"
      aria-label={`${opportunity.title} — ${opportunity.unitId}`}
    >
      <div className="opportunity__head">
        <span className="item__meta">
          {opportunity.kind} · {opportunity.unitId}
        </span>
        {applied && (
          <span className="tag">
            <Icon name="check" size={14} />
            Aplicada
          </span>
        )}
      </div>
      <h3>{opportunity.title}</h3>
      <p className="muted">{opportunity.description}</p>
      <p className="hint">
        <strong>Evidência:</strong> {opportunity.evidence}
      </p>
      <div className="opportunity__foot">
        <div>
          <div className="opportunity__saving">
            ~{formatNumber(opportunity.monthlySavingLiters)} <small>L/mês</small>
          </div>
          <span className="tag">Esforço {opportunity.effort.toLowerCase()}</span>
        </div>
        {!applied && canApply && (
          <button type="button" className="btn btn--primary" onClick={onApply}>
            Aplicar
          </button>
        )}
      </div>
    </article>
  );
}

/**
 * Oportunidades de reuso e reducao de desperdicio (R02 / HU05).
 *
 * ADAPTER EM MEMORIA / ESTIMATIVAS DE DEMONSTRACAO: o backend do R02 nao existe. O
 * consumo-base e o historico vem de dados reais; o catalogo e os percentuais de
 * economia sao fixos de demonstracao (ver core/reuse/opportunities.ts), e "aplicada"
 * vale so neste navegador.
 */
export function ReusePage({
  statusApi,
  readingApi,
  appliedStore,
  now = () => new Date(),
}: ReusePageProps): JSX.Element {
  const flash = useFlash();
  const user = useUser();
  const canApply = can(user?.roles ?? [], PERMISSIONS.INSIGHTS_APPLY);
  const [histories, setHistories] = useState<UnitHistory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setVersion] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const statuses = await statusApi.list();
        const all = await Promise.all(statuses.map((s) => readingApi.listByUnit(s.unitId)));
        if (!cancelled) {
          setError(null);
          setHistories(
            statuses.map((s, i) => ({
              unitId: s.unitId,
              readings: toChartPoints(all[i] ?? [], ALL_READINGS),
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Falha ao carregar o histórico de consumo',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusApi, readingApi, attempt]);

  const analysis = useMemo(
    () => (histories ? analyzeReuse(histories, now()) : null),
    // O relogio so importa a cada carga dos dados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [histories],
  );

  const open = analysis?.opportunities.filter((o) => !appliedStore.has(o.id)) ?? [];
  const applied = analysis?.opportunities.filter((o) => appliedStore.has(o.id)) ?? [];

  function handleApply(opportunity: Opportunity): void {
    appliedStore.apply(opportunity.id);
    setVersion((v) => v + 1);
    flash('Oportunidade marcada como aplicada.');
  }

  return (
    <section className="page">
      <h1>Reuso e economia</h1>

      <p className="hint">
        Estimativas de demonstração: o consumo e o histórico vêm da API, mas o catálogo de
        oportunidades e os percentuais de economia são valores de referência fixos (adapter em
        memória), não o resultado de uma análise. O backend do R02 ainda não existe, e marcar como
        aplicada vale só neste navegador.
      </p>

      {error && (
        <>
          <p className="form-alert" role="alert">
            {error}
          </p>
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setError(null);
                setHistories(null);
                setAttempt((n) => n + 1);
              }}
            >
              Tentar de novo
            </button>
          </div>
        </>
      )}

      {!analysis ? (
        !error && <p className="hint">Carregando…</p>
      ) : histories?.length === 0 ? (
        <p className="list-empty">Nenhuma unidade com sensor ou leitura registrada ainda.</p>
      ) : (
        <>
          <section className="glass opportunity" aria-label="Resumo">
            <span className="item__meta">Potencial de economia (estimado — demonstração)</span>
            <div className="opportunity__saving">
              ~{formatNumber(sumSavings(open))} <small>L/mês</small>
            </div>
            <span className="item__meta">
              {open.length} oportunidade(s) em aberto
              {applied.length > 0 &&
                ` · ${formatNumber(sumSavings(applied))} L/mês marcados como aplicados (estimativa)`}
            </span>
            <span className="item__meta">
              As oportunidades partem do mesmo consumo-base e não são independentes: a soma pode
              superestimar a economia. Nada aqui é economia medida.
            </span>
          </section>

          {open.length > 0 && (
            <section className="page__section" aria-labelledby="open-title">
              <h2 id="open-title">Oportunidades</h2>
              {open.map((o) => (
                <OpportunityCard
                  key={o.id}
                  opportunity={o}
                  applied={false}
                  canApply={canApply}
                  onApply={() => handleApply(o)}
                />
              ))}
            </section>
          )}

          {applied.length > 0 && (
            <section className="page__section" aria-labelledby="applied-title">
              <h2 id="applied-title">Já aplicadas</h2>
              {applied.map((o) => (
                <OpportunityCard
                  key={o.id}
                  opportunity={o}
                  applied
                  canApply={false}
                  onApply={() => undefined}
                />
              ))}
            </section>
          )}

          {analysis.stale.length > 0 && (
            <section className="page__section" aria-labelledby="stale-title">
              <h2 id="stale-title">Sem leituras recentes</h2>
              <ul className="glass list" aria-label="Unidades sem leituras recentes">
                {analysis.stale.map((unitId) => (
                  <li key={unitId}>
                    <div className="item__title">{unitId}</div>
                    <div className="item__meta">
                      A última leitura tem mais de {MAX_LAST_READING_AGE_HOURS} horas: não há
                      recomendações enquanto o sensor não voltar a enviar dados.
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {analysis.insufficient.length > 0 && (
            <section className="page__section" aria-labelledby="insufficient-title">
              <h2 id="insufficient-title">Sem histórico suficiente</h2>
              <ul className="glass list" aria-label="Unidades sem histórico suficiente">
                {analysis.insufficient.map((unitId) => (
                  <li key={unitId}>
                    <div className="item__title">{unitId}</div>
                    <div className="item__meta">
                      Não há histórico suficiente para gerar recomendações (é preciso ao menos{' '}
                      {MIN_HISTORY_HOURS} horas de leituras).
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}
