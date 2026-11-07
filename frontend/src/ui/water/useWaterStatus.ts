import { useCallback, useEffect, useRef, useState } from 'react';
import type { UnitConsumptionStatus } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { WaterStatusApi } from '../../core/api/water-status-api';
import type { RealtimeClient } from '../../core/realtime/realtime-client';
import {
  MAX_CHART_POINTS,
  applyReadingEvent,
  mergeStatuses,
  refreshStates,
  type ChartPoint,
} from '../../core/water/consumption';

/** Parte do RealtimeClient que o painel usa (permite injetar um fake nos testes). */
export type RealtimeLike = Pick<
  RealtimeClient,
  'connect' | 'subscribeUnit' | 'onReading' | 'onReconnect' | 'disconnect'
>;

/** A cada quantos ms o estado e recalculado para detectar "Sem dados recentes". */
export const DEFAULT_TICK_MS = 30_000;

interface Options {
  statusApi: Pick<WaterStatusApi, 'list'>;
  createRealtime: () => RealtimeLike;
  getToken: () => string | null;
  now?: () => Date;
  tickMs?: number;
  /**
   * Quantas leituras ao vivo guardar por unidade (padrao: as do grafico). Quem SOMA
   * leituras (consumo do dia) precisa de todas as da sessao: com o teto do grafico, as
   * mais antigas sairiam da soma sem nunca terem entrado no historico buscado.
   */
  maxLivePoints?: number;
}

export interface UseWaterStatus {
  statuses: UnitConsumptionStatus[];
  loading: boolean;
  /** Ha uma atualizacao (GET /water-status) em andamento. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Leituras recebidas ao vivo nesta sessao, por unidade (ultimas `maxLivePoints`). */
  liveReadings: Record<string, ChartPoint[]>;
  /**
   * Quantas vezes a conexao voltou depois de cair. Leituras enviadas enquanto estava
   * fora nao chegam pelo WebSocket: quem guarda historico deve rebuscá-lo quando muda.
   */
  reconnects: number;
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
  maxLivePoints = MAX_CHART_POINTS,
}: Options): UseWaterStatus {
  const [statuses, setStatuses] = useState<UnitConsumptionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveReadings, setLiveReadings] = useState<Record<string, ChartPoint[]>>({});
  const [client, setClient] = useState<RealtimeLike | null>(null);
  const [reconnects, setReconnects] = useState(0);
  const subscribed = useRef(new Map<RealtimeLike, Set<string>>());
  const nowRef = useRef(now);
  nowRef.current = now;
  const maxLiveRef = useRef(maxLivePoints);
  maxLiveRef.current = maxLivePoints;
  const statusesRef = useRef<UnitConsumptionStatus[]>([]);
  statusesRef.current = statuses;
  const refreshRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await statusApi.list();
      // Leitura que chegou pelo WebSocket durante a requisicao nao pode ser sobrescrita.
      setStatuses((current) =>
        refreshStates(
          mergeStatuses(current, refreshStates(list, nowRef.current())),
          nowRef.current(),
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar o consumo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusApi]);

  refreshRef.current = refresh;

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
        ].slice(-maxLiveRef.current),
      }));
    });
    // Reconexao: o servidor perdeu as rooms da conexao anterior. Reassina as unidades
    // conhecidas e recarrega o estado (leituras podem ter passado enquanto estava fora).
    const stopReconnect = realtime.onReconnect(() => {
      const done = new Set<string>();
      registry.set(realtime, done);
      for (const { unitId } of statusesRef.current) {
        realtime.subscribeUnit(unitId);
        done.add(unitId);
      }
      setReconnects((count) => count + 1);
      void refreshRef.current();
    });
    setClient(realtime);
    return () => {
      stop();
      stopReconnect();
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

  return { statuses, loading, refreshing, error, refresh, liveReadings, reconnects };
}
