import { useCallback, useEffect, useRef, useState } from 'react';
import type { UnitConsumptionStatus } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { WaterStatusApi } from '../../core/api/water-status-api';
import type { RealtimeClient } from '../../core/realtime/realtime-client';
import {
  MAX_CHART_POINTS,
  applyReadingEvent,
  refreshStates,
  type ChartPoint,
} from '../../core/water/consumption';

/** Parte do RealtimeClient que o painel usa (permite injetar um fake nos testes). */
export type RealtimeLike = Pick<
  RealtimeClient,
  'connect' | 'subscribeUnit' | 'onReading' | 'disconnect'
>;

/** A cada quantos ms o estado e recalculado para detectar "Sem dados recentes". */
export const DEFAULT_TICK_MS = 30_000;

interface Options {
  statusApi: Pick<WaterStatusApi, 'list'>;
  createRealtime: () => RealtimeLike;
  getToken: () => string | null;
  now?: () => Date;
  tickMs?: number;
}

export interface UseWaterStatus {
  statuses: UnitConsumptionStatus[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Leituras recebidas ao vivo nesta sessao, por unidade (ultimas MAX_CHART_POINTS). */
  liveReadings: Record<string, ChartPoint[]>;
}

/**
 * Estado de consumo por unidade em tempo real (R05).
 *
 * 1. busca o estado atual (GET /water-status);
 * 2. conecta ao WebSocket e assina cada unidade; cada leitura recebida atualiza o valor;
 * 3. a cada `tickMs` recalcula o estado: a passagem para "Sem dados recentes" nao e
 *    emitida pelo servidor (contrato-iot.md, secao 5).
 */
export function useWaterStatus({
  statusApi,
  createRealtime,
  getToken,
  now = () => new Date(),
  tickMs = DEFAULT_TICK_MS,
}: Options): UseWaterStatus {
  const [statuses, setStatuses] = useState<UnitConsumptionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveReadings, setLiveReadings] = useState<Record<string, ChartPoint[]>>({});
  const [client, setClient] = useState<RealtimeLike | null>(null);
  const subscribed = useRef(new Map<RealtimeLike, Set<string>>());
  const nowRef = useRef(now);
  nowRef.current = now;

  const refresh = useCallback(async () => {
    try {
      const list = await statusApi.list();
      setStatuses(refreshStates(list, nowRef.current()));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar o consumo');
    } finally {
      setLoading(false);
    }
  }, [statusApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Conexao em tempo real: um cliente por montagem; leituras novas atualizam o painel.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      return;
    }
    const registry = subscribed.current;
    const realtime = createRealtime();
    realtime.connect(token);
    const stop = realtime.onReading((event) => {
      setStatuses((current) => applyReadingEvent(current, event, nowRef.current()));
      setLiveReadings((current) => ({
        ...current,
        [event.unitId]: [
          ...(current[event.unitId] ?? []),
          { t: Date.parse(event.timestamp), v: event.valueInLiters },
        ].slice(-MAX_CHART_POINTS),
      }));
    });
    setClient(realtime);
    return () => {
      stop();
      realtime.disconnect();
      registry.delete(realtime);
      setClient(null);
    };
  }, [createRealtime, getToken]);

  // Assina cada unidade (inclusive as que aparecem depois de atualizar).
  useEffect(() => {
    if (!client) {
      return;
    }
    const done = subscribed.current.get(client) ?? new Set<string>();
    subscribed.current.set(client, done);
    for (const { unitId } of statuses) {
      if (!done.has(unitId)) {
        client.subscribeUnit(unitId);
        done.add(unitId);
      }
    }
  }, [client, statuses]);

  useEffect(() => {
    const id = setInterval(
      () => setStatuses((current) => refreshStates(current, nowRef.current())),
      tickMs,
    );
    return () => clearInterval(id);
  }, [tickMs]);

  return { statuses, loading, error, refresh, liveReadings };
}
