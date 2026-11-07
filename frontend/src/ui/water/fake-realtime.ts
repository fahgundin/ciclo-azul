import { act } from '@testing-library/react';
import { vi } from 'vitest';
import type { ReadingEvent } from '@ciclo-azul/contracts';
import type { RealtimeLike } from './useWaterStatus';

/** Cliente de tempo real falso para testes: guarda os handlers e deixa o teste "enviar" leituras. */
export function fakeRealtime() {
  const handlers = new Set<(event: ReadingEvent) => void>();
  const mock = {
    connect: vi.fn(),
    subscribeUnit: vi.fn(),
    disconnect: vi.fn(),
    onReading: vi.fn((handler: (event: ReadingEvent) => void) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    }),
  };
  return {
    realtime: mock as unknown as RealtimeLike,
    mock,
    emit: (event: ReadingEvent) => act(() => handlers.forEach((handler) => handler(event))),
  };
}
