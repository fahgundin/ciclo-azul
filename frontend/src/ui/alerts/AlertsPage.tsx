import { useEffect, useMemo, useState } from 'react';
import type { WasteTypeView } from '@ciclo-azul/contracts';
import type { WaterReadingApi } from '../../core/api/water-reading-api';
import type { WaterStatusApi } from '../../core/api/water-status-api';
import type { WasteTypeApi } from '../../core/api/waste-type-api';
import { PERMISSIONS, can } from '../../core/auth/permissions';
import {
  ALERT_KIND_LABEL,
  evaluateAlerts,
  limitLevel,
  type LimitLevel,
} from '../../core/alerts/alerts';
import { formatLiters, formatNumber } from '../../core/format';
import type { LimitStore } from '../../core/limits/limits';
import type { PendingLotStore } from '../../core/waste/pending-lot';
import {
  dailyConsumption,
  mergeChartPoints,
  toChartPoints,
  type ChartPoint,
} from '../../core/water/consumption';
import { Dialog } from '../components/Dialog';
import { useFlash } from '../components/Flash';
import { Icon } from '../components/Icon';
import '../styles/alerts.css';
import '../styles/components.css';
import { useUser } from '../UserContext';
import { useWaterStatus, type RealtimeLike } from '../water/useWaterStatus';
import { LimitsForm } from './LimitsForm';

interface AlertsPageProps {
  statusApi: Pick<WaterStatusApi, 'list'>;
  readingApi: Pick<WaterReadingApi, 'listByUnit'>;
  wasteApi: Pick<WasteTypeApi, 'list'>;
  createRealtime: () => RealtimeLike;
  getToken: () => string | null;
  /** ADAPTERS EM MEMORIA (R03/R08). */
  limitStore: LimitStore;
  pendingLotStore: PendingLotStore;
  /** Relogio e intervalo de recalculo injetaveis (testes). */
  now?: () => Date;
  tickMs?: number;
}

const ALL_READINGS = Number.POSITIVE_INFINITY;

const LEVEL_TEXT: Record<LimitLevel, string> = {
  ok: 'Dentro do limite',
  warn: 'Perto do limite',
  crit: 'Limite excedido',
};

function LimitRow({
  name,
  used,
  limit,
}: {
  name: string;
  used: number;
  limit: number;
}): JSX.Element {
  const level = limitLevel(used, limit);
  const percent = Math.round((used / limit) * 100);
  return (
    <li>
      <div className="limit__head">
        <span className="item__title">{name}</span>
        <span
          className={level === 'ok' ? 'tag' : level === 'warn' ? 'tag tag--warn' : 'tag tag--crit'}
        >
          <Icon name={level === 'ok' ? 'check' : 'alert'} size={14} />
          {formatNumber(percent)}% · {LEVEL_TEXT[level]}
        </span>
      </div>
      <div
        className={`bar bar--${level}`}
        role="progressbar"
        aria-label={`Consumo de ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
      >
        <i style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <div className="item__meta">
        {formatLiters(used)} de {formatLiters(limit)}
      </div>
    </li>
  );
}

/**
 * Alertas e limites de consumo (R03 / HU04 e R08 / HU08).
 *
 * ADAPTER NO CLIENTE: o backend nao tem limites, lotes pendentes nem alertas. Os
 * limites e os lotes pendentes ficam em adapters EM MEMORIA (so neste navegador) e
 * os alertas sao CALCULADOS aqui sobre dados reais (estado e leituras). Nao ha
 * notificacao push nem e-mail. Ver docs/migracao-frontend.md.
 */
export function AlertsPage({
  statusApi,
  readingApi,
  wasteApi,
  createRealtime,
  getToken,
  limitStore,
  pendingLotStore,
  now = () => new Date(),
  tickMs,
}: AlertsPageProps): JSX.Element {
  const flash = useFlash();
  const user = useUser();
  const canSetLimits = can(user?.roles ?? [], PERMISSIONS.WATER_LIMITS);
  const canSeeWaste = can(user?.roles ?? [], PERMISSIONS.WASTE_TYPES);

  // O consumo do dia SOMA as leituras: guarda todas as da sessao (sem o teto de 60 do
  // grafico), senao as mais antigas sairiam da soma e o alerta de limite deixaria de disparar.
  const { statuses, loading, refreshing, error, refresh, liveReadings, reconnects } =
    useWaterStatus({
      statusApi,
      createRealtime,
      getToken,
      now,
      tickMs,
      maxLivePoints: ALL_READINGS,
    });
  const [limits, setLimits] = useState(() => limitStore.get());
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [histories, setHistories] = useState<Record<string, ChartPoint[]>>({});
  const [historyError, setHistoryError] = useState(false);
  const [version, setVersion] = useState(0);
  const [wasteTypes, setWasteTypes] = useState<WasteTypeView[]>([]);

  const unitKey = statuses.map((s) => s.unitId).join('|');

  // Historico de cada unidade, para somar o consumo do dia.
  useEffect(() => {
    const unitIds = unitKey ? unitKey.split('|') : [];
    let cancelled = false;
    setHistoryError(false);
    Promise.all(unitIds.map((id) => readingApi.listByUnit(id)))
      .then((all) => {
        if (!cancelled) {
          setHistories(
            Object.fromEntries(
              unitIds.map((id, i) => [id, toChartPoints(all[i] ?? [], ALL_READINGS)]),
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryError(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // `reconnects`: leituras enviadas com a conexao caida nao chegam ao vivo; rebusca o historico.
  }, [readingApi, unitKey, version, reconnects]);

  // Nomes dos tipos de residuo (so o Gestor tem acesso a esse endpoint).
  useEffect(() => {
    if (!canSeeWaste) {
      return;
    }
    wasteApi
      .list()
      .then(setWasteTypes)
      .catch(() => setWasteTypes([]));
  }, [wasteApi, canSeeWaste]);

  const today = now();
  const consumptionToday = useMemo(() => {
    const result: Record<string, number> = {};
    for (const unitId of unitKey ? unitKey.split('|') : []) {
      const points = mergeChartPoints(
        histories[unitId] ?? [],
        liveReadings[unitId] ?? [],
        ALL_READINGS,
      );
      result[unitId] = dailyConsumption(points, today);
    }
    return result;
    // `today` muda a cada render; o dia so muda a cada 24 h, entao basta a data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitKey, histories, liveReadings, today.toISOString().slice(0, 10)]);

  const pendingLots = canSeeWaste ? pendingLotStore.list() : [];
  const alerts = evaluateAlerts({
    now: today,
    statuses,
    consumptionToday,
    limits,
    pendingLots,
    wasteTypes,
  });

  const limitedUnits = Object.keys(limits.units).filter((unitId) => limits.units[unitId]);
  const knownUnits = [...new Set([...statuses.map((s) => s.unitId), ...limitedUnits])].sort(
    (a, b) => a.localeCompare(b, 'pt-BR'),
  );
  const generalUsed = Object.values(consumptionToday).reduce((sum, v) => sum + v, 0);
  const hasLimits = limits.general !== null || limitedUnits.length > 0;

  return (
    <section className="page">
      <h1>Alertas e limites</h1>

      <p className="hint">
        Limites e lotes sem destinação ficam só neste navegador (adapter em memória) e os alertas
        são calculados aqui: o backend ainda não tem limites, lotes pendentes nem alertas (R03/R08),
        e não há notificação por push ou e-mail.
      </p>

      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            void refresh();
            setVersion((v) => v + 1);
          }}
          disabled={refreshing}
          aria-busy={refreshing}
        >
          {refreshing ? 'Atualizando…' : 'Atualizar'}
        </button>
        {canSetLimits && (
          <button type="button" className="btn btn--primary" onClick={() => setLimitsOpen(true)}>
            Definir limites de consumo
          </button>
        )}
      </div>

      {(error || historyError) && (
        <p className="form-alert" role="alert">
          {error ??
            'Não foi possível carregar o consumo do dia; os alertas de limite podem estar incompletos.'}
        </p>
      )}

      <section className="page__section" aria-labelledby="open-alerts-title">
        <h2 id="open-alerts-title">Alertas em aberto</h2>
        {loading ? (
          <p className="hint">Carregando…</p>
        ) : alerts.length === 0 ? (
          <p className="list-empty">Nenhum alerta em aberto.</p>
        ) : (
          <ul className="glass list" aria-label="Alertas em aberto">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <div className="alert__head">
                  <span className={alert.level === 'crit' ? 'tag tag--crit' : 'tag tag--warn'}>
                    <Icon name="alert" size={14} />
                    {alert.level === 'crit' ? 'Crítico' : 'Atenção'}
                  </span>
                  <span className="item__meta">{ALERT_KIND_LABEL[alert.kind]}</span>
                </div>
                <div className="item__title">{alert.title}</div>
                <div className="item__meta">{alert.body}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="page__section" aria-labelledby="limits-title">
        <h2 id="limits-title">Limites diários</h2>
        {hasLimits ? (
          <ul className="glass list" aria-label="Limites diários">
            {limits.general !== null && (
              <LimitRow name="Geral" used={generalUsed} limit={limits.general} />
            )}
            {limitedUnits.map((unitId) => (
              <LimitRow
                key={unitId}
                name={unitId}
                used={consumptionToday[unitId] ?? 0}
                limit={limits.units[unitId] as number}
              />
            ))}
          </ul>
        ) : (
          <p className="list-empty">
            Nenhum limite definido{canSetLimits ? '. Use "Definir limites de consumo".' : '.'}
          </p>
        )}
        <p className="hint">
          Consumo do dia = soma das leituras do dia (UTC), em litros. Pressupõe leituras
          incrementais, ainda a confirmar no contrato.
        </p>
      </section>

      <Dialog
        open={limitsOpen}
        title="Definir limites de consumo"
        onClose={() => setLimitsOpen(false)}
      >
        <LimitsForm
          units={knownUnits}
          initial={limits}
          onSave={(next) => {
            limitStore.save(next);
            setLimits(next);
            flash('Limites atualizados.');
          }}
          onClose={() => setLimitsOpen(false)}
        />
      </Dialog>
    </section>
  );
}
