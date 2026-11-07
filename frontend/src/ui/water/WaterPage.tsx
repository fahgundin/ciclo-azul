import { useEffect, useMemo, useState } from 'react';
import {
  NO_RECENT_DATA_LABEL,
  STALE_AFTER_MINUTES,
  type UnitConsumptionStatus,
} from '@ciclo-azul/contracts';
import type { WaterReadingApi } from '../../core/api/water-reading-api';
import type { WaterStatusApi } from '../../core/api/water-status-api';
import { formatDateTime, formatLiters } from '../../core/format';
import { mergeChartPoints, toChartPoints, type ChartPoint } from '../../core/water/consumption';
import { Icon } from '../components/Icon';
import '../styles/components.css';
import '../styles/water.css';
import { LineChart } from './LineChart';
import { useWaterStatus, type RealtimeLike } from './useWaterStatus';

interface WaterPageProps {
  statusApi: Pick<WaterStatusApi, 'list'>;
  readingApi: Pick<WaterReadingApi, 'listByUnit'>;
  createRealtime: () => RealtimeLike;
  getToken: () => string | null;
  /** Relogio e intervalo de recalculo injetaveis (testes). */
  now?: () => Date;
  tickMs?: number;
}

const ORIGIN_LABEL = { sensor: 'sensor', manual: 'leitura manual' } as const;

function StateTag({ state }: { state: UnitConsumptionStatus['state'] }): JSX.Element {
  if (state === 'live') {
    return (
      <span className="tag">
        <Icon name="check" size={14} />
        Dados recentes
      </span>
    );
  }
  return (
    <span className="tag tag--warn">
      <Icon name="alert" size={14} />
      {state === 'stale' ? NO_RECENT_DATA_LABEL : 'Sem leituras'}
    </span>
  );
}

/**
 * Monitoramento de consumo de agua em tempo real por unidade (R05 / HU03), sobre a
 * API real: GET /water-status + WebSocket. Ver useWaterStatus.
 */
export function WaterPage({
  statusApi,
  readingApi,
  createRealtime,
  getToken,
  now,
  tickMs,
}: WaterPageProps): JSX.Element {
  const { statuses, loading, refreshing, error, refresh, liveReadings } = useWaterStatus({
    statusApi,
    createRealtime,
    getToken,
    now,
    tickMs,
  });
  const [chosenUnit, setChosenUnit] = useState('');
  const [history, setHistory] = useState<{ unitId: string; points: ChartPoint[] } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Unidade do grafico: a escolhida, ou a primeira da lista.
  const unitId = statuses.some((s) => s.unitId === chosenUnit)
    ? chosenUnit
    : (statuses[0]?.unitId ?? '');

  useEffect(() => {
    if (!unitId) {
      return;
    }
    let cancelled = false;
    setHistoryError(null);
    readingApi
      .listByUnit(unitId)
      .then((readings) => {
        if (!cancelled) {
          setHistory({ unitId, points: toChartPoints(readings) });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistory({ unitId, points: [] });
          setHistoryError('Não foi possível carregar o histórico desta unidade.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [readingApi, unitId]);

  const points = useMemo(
    () =>
      mergeChartPoints(
        history?.unitId === unitId ? history.points : [],
        liveReadings[unitId] ?? [],
      ),
    [history, liveReadings, unitId],
  );

  return (
    <section className="page">
      <h1>Consumo de água</h1>

      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={() => void refresh()}
          disabled={refreshing}
          aria-busy={refreshing}
        >
          {refreshing ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>
      <p className="hint">
        Atualiza em tempo real a cada leitura recebida. Unidade sem leitura há mais de{' '}
        {STALE_AFTER_MINUTES} minutos aparece como "{NO_RECENT_DATA_LABEL}".
      </p>

      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="hint">Carregando…</p>
      ) : statuses.length === 0 ? (
        !error && (
          <p className="list-empty">Nenhuma unidade com sensor ou leitura registrada ainda.</p>
        )
      ) : (
        <ul className="glass list" aria-label="Consumo por unidade">
          {statuses.map((status) => (
            <li key={status.unitId} aria-label={`Unidade ${status.unitId}`}>
              <div className="item__title">{status.unitId}</div>
              <div className="water__value">
                {status.currentValueInLiters === null
                  ? '—'
                  : formatLiters(status.currentValueInLiters)}
              </div>
              <div className="item__meta">
                {status.lastReadingAt && status.lastReadingType
                  ? `Última leitura: ${formatDateTime(status.lastReadingAt)} · ${ORIGIN_LABEL[status.lastReadingType]}`
                  : 'Nenhuma leitura recebida'}
              </div>
              <StateTag state={status.state} />
            </li>
          ))}
        </ul>
      )}

      {statuses.length > 0 && (
        <section className="page__section" aria-labelledby="water-chart-title">
          <h2 id="water-chart-title">Últimas leituras</h2>
          <div className="field">
            <label htmlFor="water-unit">Unidade</label>
            <select
              id="water-unit"
              className="field__input"
              value={unitId}
              onChange={(e) => setChosenUnit(e.target.value)}
            >
              {statuses.map((status) => (
                <option key={status.unitId} value={status.unitId}>
                  {status.unitId}
                </option>
              ))}
            </select>
          </div>
          <div className="glass water__chart">
            <LineChart points={points} label={`Leituras de consumo de ${unitId}, em litros`} />
          </div>
          {historyError && (
            <p className="form-alert" role="alert">
              {historyError}
            </p>
          )}
        </section>
      )}
    </section>
  );
}
