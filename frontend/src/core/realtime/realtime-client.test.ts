import { describe, it, expect, vi } from 'vitest';
import { RealtimeClient, type RealtimeSocket } from './realtime-client';
import type { ReadingEvent } from '@ciclo-azul/contracts';

/** Socket falso que captura handlers/emits e permite disparar eventos. */
function makeFakeSocket() {
  const listeners: Record<string, (payload: unknown) => void> = {};
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const socket: RealtimeSocket = {
    on: (event, handler) => {
      listeners[event] = handler;
    },
    emit: (event, payload) => {
      emitted.push({ event, payload });
    },
    disconnect: vi.fn(),
  };
  return { socket, listeners, emitted };
}

const sampleEvent: ReadingEvent = {
  unitId: 'data-center-sp-01',
  sensorId: 's1',
  timestamp: '2026-11-01T22:05:30.000Z',
  valueInLiters: 123,
  readingType: 'sensor',
};

describe('RealtimeClient (core/realtime)', () => {
  it('conecta com o token via factory e assina a unidade', () => {
    const fake = makeFakeSocket();
    const factory = vi.fn().mockReturnValue(fake.socket);
    const client = new RealtimeClient('ws://localhost:3000', factory);

    client.connect('meu-token');
    client.subscribeUnit('data-center-sp-01');

    expect(factory).toHaveBeenCalledWith('ws://localhost:3000', 'meu-token');
    expect(fake.emitted).toEqual([
      { event: 'subscribe-unit', payload: 'data-center-sp-01' },
    ]);
  });

  it('entrega leituras recebidas aos handlers', () => {
    const fake = makeFakeSocket();
    const client = new RealtimeClient('ws://x', () => fake.socket);
    const received: ReadingEvent[] = [];
    client.connect('t');
    client.onReading((e) => received.push(e));

    fake.listeners['reading'](sampleEvent);

    expect(received).toEqual([sampleEvent]);
  });

  it('permite cancelar a assinatura de um handler', () => {
    const fake = makeFakeSocket();
    const client = new RealtimeClient('ws://x', () => fake.socket);
    const received: ReadingEvent[] = [];
    client.connect('t');
    const off = client.onReading((e) => received.push(e));
    off();

    fake.listeners['reading'](sampleEvent);

    expect(received).toEqual([]);
  });

  it('avisa os handlers de reconexao so a partir da segunda conexao', () => {
    const fake = makeFakeSocket();
    const client = new RealtimeClient('ws://x', () => fake.socket);
    const onReconnect = vi.fn();
    client.connect('t');
    client.onReconnect(onReconnect);

    fake.listeners['connect'](undefined); // primeira conexao
    expect(onReconnect).not.toHaveBeenCalled();

    fake.listeners['connect'](undefined); // queda e volta: o servidor perdeu as rooms
    fake.listeners['connect'](undefined);
    expect(onReconnect).toHaveBeenCalledTimes(2);
  });

  it('permite cancelar o handler de reconexao', () => {
    const fake = makeFakeSocket();
    const client = new RealtimeClient('ws://x', () => fake.socket);
    const onReconnect = vi.fn();
    client.connect('t');
    const off = client.onReconnect(onReconnect);
    off();

    fake.listeners['connect'](undefined);
    fake.listeners['connect'](undefined);

    expect(onReconnect).not.toHaveBeenCalled();
  });
});
