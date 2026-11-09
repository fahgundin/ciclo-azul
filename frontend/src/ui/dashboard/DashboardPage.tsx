import { useEffect, useMemo, useState } from 'react';
import type { WasteLotView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { WasteLotApi } from '../../core/api/waste-lot-api';
import type { WaterReadingApi } from '../../core/api/water-reading-api';
import type { WaterStatusApi } from '../../core/api/water-status-api';
import { PERMISSIONS, can } from '../../core/auth/permissions';
import { formatLiters, formatNumber } from '../../core/format';
import {
  CHART_DAYS,
  dailySeries,
  reuseKpi,
  wasteKpi,
  waterKpi,
  type DayConsumption,
} from '../../core/kpis/kpis';
import type { LimitStore } from '../../core/limits/limits';
import { analyzeReuse, type AppliedStore, type UnitHistory } from '../../core/reuse/opportunities';
import type { PendingLotStore } from '../../core/waste/pending-lot';
import { toChartPoints } from '../../core/water/consumption';
import { Icon } from '../components/Icon';
import '../styles/alerts.css';
import '../styles/components.css';
import '../styles/dashboard.css';
import { useUser } from '../UserContext';

interface DashboardPageProps {
  statusApi: Pick<WaterStatusApi, 'list'>;
  readingApi: Pick<WaterReadingApi, 'listByUnit'>;
  lotApi: Pick<WasteLotApi, 'list'>;
  /** ADAPTERS EM MEMORIA (R03/R08/R02): valem so neste navegador. */
  limitStore: LimitStore;
  pendingLotStore: PendingLotStore;
  appliedStore: AppliedStore;
  /** Relogio injetavel (testes). */
  now?: () => Date;
}

const ALL_READINGS = Number.POSITIVE_INFINITY;

const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

const LEVEL_TEXT = {
  ok: 'Dentro do limite',
  warn: 'Perto do limite',
  crit: 'Limite excedido',
} as const;

function DayChart({ days, limit }: { days: DayConsumption[]; limit: number | null }): JSX.Element {
  const max = Math.max(1, limit ?? 0, ...days.map((d) => d.liters));
  return (
    <ol
      className="glass daychart"
      aria-label={`Consumo diário de água nos últimos ${CHART_DAYS} dias, em litros`}
    >
      {days.map((day) => {
        const date = new Date(day.dayStart);
        const over = limit !== null && day.liters > limit;
        return (
          <li
            key={day.dayStart}
            title={`${dayFormat.format(date)}: ${formatLiters(day.liters)}${day.partial ? ' (hoje, parcial)' : ''}${over ? ' — acima do limite' : ''}`}
          >
            <span className="daychart__value">{formatNumber(day.liters)}</span>
            <span
              className={`daychart__bar${over ? ' daychart__bar--over' : ''}${day.partial ? ' daychart__bar--partial' : ''}`}
              style={{ height: `${Math.max(2, (day.liters / max) * 100)}%` }}
            />
            <span className="daychart__day">
              {weekdayFormat.format(date)}
              {day.partial && '*'}
            </span>
            {over && <span className="daychart__value">acima</span>}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Painel de KPIs (R10 / HU09).
 *
 * ADAPTER NO CLIENTE: o backend nao tem endpoint de KPIs. Consumo e lotes destinados
 * vem da API real; limite, lotes pendentes e oportunidades aplicadas vem de adapters EM
 * MEMORIA (so neste navegador); reuso e economia sao ESTIMATIVAS de demonstracao. Ver
 * docs/migracao-frontend.md.
 */
export function DashboardPage({
  statusApi,
  readingApi,
  lotApi,
  limitStore,
  pendingLotStore,
  appliedStore,
  now = () => new Date(),
}: DashboardPageProps): JSX.Element {
  const user = useUser();
  const roles = user?.roles ?? [];
  const canSeeLots = can(roles, PERMISSIONS.WASTE_VIEW);
  const canSeePending = can(roles, PERMISSIONS.WASTE_TYPES);

  const [histories, setHistories] = useState<UnitHistory[] | null>(null);
  const [lots, setLots] = useState<WasteLotView[] | null>(null);
  const [waterError, setWaterError] = useState<string | null>(null);
  const [lotsError, setLotsError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadedAt, setLoadedAt] = useState(() => now());

  useEffect(() => {
    let cancelled = false;
    setWaterError(null);
    (async () => {
      try {
        const statuses = await statusApi.list();
        const all = await Promise.all(statuses.map((s) => readingApi.listByUnit(s.unitId)));
        if (!cancelled) {
          setHistories(
            statuses.map((s, i) => ({
              unitId: s.unitId,
              readings: toChartPoints(all[i] ?? [], ALL_READINGS),
            })),
          );
          setLoadedAt(now());
        }
      } catch (err) {
        if (!cancelled) {
          setWaterError(
            err instanceof ApiError ? err.message : 'Falha ao carregar o consumo de água',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // `now` e injetado so em testes; recarregar depende apenas das APIs e da tentativa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusApi, readingApi, attempt]);

  useEffect(() => {
    if (!canSeeLots) {
      return;
    }
    let cancelled = false;
    setLotsError(null);
    lotApi
      .list()
      .then((result) => {
        if (!cancelled) {
          setLots(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLotsError(
            err instanceof ApiError ? err.message : 'Falha ao carregar os lotes de resíduos',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lotApi, canSeeLots, attempt]);

  const view = useMemo(() => {
    if (!histories) {
      return null;
    }
    const points = histories.flatMap((h) => h.readings);
    const days = dailySeries(points, loadedAt);
    const limits = limitStore.get();
    return {
      days,
      water: waterKpi(days[days.length - 1]?.liters ?? 0, limits.general),
      reuse: reuseKpi(analyzeReuse(histories, loadedAt), (id) => appliedStore.has(id)),
    };
  }, [histories, loadedAt, limitStore, appliedStore]);

  const waste = lots
    ? wasteKpi(lots.length, canSeePending ? pendingLotStore.list() : null, loadedAt)
    : null;

  function retry(): void {
    setHistories(null);
    setLots(null);
    setAttempt((n) => n + 1);
  }

  const water = view?.water;

  return (
    <section className="page">
      <h1>Painel{user ? `, ${user.name.split(' ')[0] ?? ''}` : ''}</h1>

      <p className="hint">
        Indicadores calculados neste navegador: o backend ainda não tem endpoint de KPIs (R10). O
        consumo e os lotes destinados vêm da API; limite, lotes sem destinação e oportunidades
        aplicadas ficam só neste navegador (adapter em memória) e reuso e economia são estimativas
        de demonstração.
      </p>

      {(waterError || lotsError) && (
        <>
          <p className="form-alert" role="alert">
            {[waterError, lotsError].filter(Boolean).join('. ')}
          </p>
          <div className="actions">
            <button type="button" className="btn" onClick={retry}>
              Tentar de novo
            </button>
          </div>
        </>
      )}

      {!view && !waterError && <p className="hint">Carregando…</p>}

      {view && water && (
        <>
          <section className="kpis" aria-label="Indicadores">
            <article className="glass kpi" aria-label="Consumo de água hoje">
              <h3>Consumo de água hoje</h3>
              <div className="kpi__value">
                {formatNumber(water.todayLiters)} <small>L</small>
              </div>
              {water.limitLiters !== null && water.level !== null && water.ratio !== null ? (
                <>
                  <span className="item__meta">
                    de {formatLiters(water.limitLiters)} (limite geral)
                  </span>
                  <div
                    className={`bar bar--${water.level}`}
                    role="progressbar"
                    aria-label="Consumo do dia frente ao limite geral"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(Math.round(water.ratio * 100), 100)}
                  >
                    <i style={{ width: `${Math.min(water.ratio * 100, 100)}%` }} />
                  </div>
                  <div className="kpi__foot">
                    <span className="item__meta">
                      {formatNumber(Math.round(water.ratio * 100))}% do limite
                    </span>
                    <span
                      className={
                        water.level === 'ok'
                          ? 'tag'
                          : water.level === 'warn'
                            ? 'tag tag--warn'
                            : 'tag tag--crit'
                      }
                    >
                      <Icon name={water.level === 'ok' ? 'check' : 'alert'} size={14} />
                      {LEVEL_TEXT[water.level]}
                    </span>
                  </div>
                </>
              ) : (
                <span className="item__meta">
                  Sem limite geral definido neste navegador (o Gestor define em Alertas).
                </span>
              )}
            </article>

            <article className="glass kpi" aria-label="Reuso de água">
              <h3>Reuso de água (estimado)</h3>
              <div className="kpi__value">
                {view.reuse.reusePercent === null
                  ? '—'
                  : `${formatNumber(view.reuse.reusePercent)}%`}
              </div>
              <span className="item__meta">
                {view.reuse.reusePercent === null
                  ? 'Sem histórico suficiente para estimar.'
                  : 'Das oportunidades de reuso aplicadas, sobre o consumo mensal. Estimativa de demonstração.'}
              </span>
            </article>

            <article className="glass kpi" aria-label="Água economizada">
              <h3>Água economizada (estimada)</h3>
              <div className="kpi__value">
                {formatNumber(view.reuse.savedLitersPerMonth)} <small>L/mês</small>
              </div>
              <span className="item__meta">
                {view.reuse.appliedCount} oportunidade(s) marcada(s) como aplicada(s) neste
                navegador. Nada aqui é economia medida.
              </span>
            </article>

            {canSeeLots && (
              <article className="glass kpi" aria-label="Resíduos destinados corretamente">
                <h3>Resíduos destinados corretamente</h3>
                {waste ? (
                  <>
                    <div className="kpi__value">
                      {waste.percent === null ? '—' : `${formatNumber(waste.percent)}%`}
                    </div>
                    <span className="item__meta">
                      {formatNumber(waste.destined)} lote(s) destinado(s)
                      {waste.open !== null && `, ${formatNumber(waste.open)} em aberto`}
                      {waste.overdue ? `, ${formatNumber(waste.overdue)} com prazo vencido` : ''}.
                      {waste.open === null &&
                        ' O percentual não é calculado: os lotes sem destinação ficam só no navegador do Gestor.'}
                    </span>
                  </>
                ) : (
                  !lotsError && <span className="item__meta">Carregando…</span>
                )}
              </article>
            )}
          </section>

          <section className="page__section" aria-labelledby="week-title">
            <h2 id="week-title">Últimos {CHART_DAYS} dias</h2>
            <DayChart days={view.days} limit={water.limitLiters} />
            <p className="hint">
              Consumo diário em litros (soma das leituras do dia, UTC). * = hoje, parcial. Pressupõe
              leituras incrementais, ainda a confirmar no contrato.
            </p>
          </section>
        </>
      )}
    </section>
  );
}
