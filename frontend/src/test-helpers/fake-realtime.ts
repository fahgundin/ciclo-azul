import { act } from '@testing-library/react';
import { vi } from 'vitest';
import type { ReadingEvent } from '@ciclo-azul/contracts';
import type { RealtimeLike } from '../ui/water/useWaterStatus';

/** Helper SO de testes (nao entra no bundle). Cliente de tempo real falso: guarda os handlers e deixa o teste "enviar" leituras. */
export function fakeRealtime() {
  const handlers = new Set<(event: ReadingEvent) => void>();
  const reconnectHandlers = new Set<() => void>();
  const mock = {
    connect: vi.fn(),
    subscribeUnit: vi.fn(),
    disconnect: vi.fn(),
    onReconnect: vi.fn((handler: () => void) => {
      reconnectHandlers.add(handler);
      return () => reconnectHandlers.delete(handler);
    }),
    onReading: vi.fn((handler: (event: ReadingEvent) => void) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    }),
  };
  return {
    realtime: mock as unknown as RealtimeLike,
    mock,
    emit: (event: ReadingEvent) => act(() => handlers.forEach((handler) => handler(event))),
    /** Simula a volta da conexao (o servidor perdeu as assinaturas). */
    reconnect: () =>
      act(async () => {
        reconnectHandlers.forEach((handler) => handler());
      }),
  };
}
