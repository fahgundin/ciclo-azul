import { WaterMonitoringGateway } from './water-monitoring.gateway';
import { OidcTokenVerifier } from '../../../../auth/oidc-token.verifier';
import type { Server, Socket } from 'socket.io';
import type { ReadingEvent } from '@ciclo-azul/contracts';

function makeClient(token?: string): Socket & { disconnected: boolean; joined: string[] } {
  return {
    handshake: { auth: token ? { token } : {}, headers: {} },
    disconnect: jest.fn(function (this: { disconnected: boolean }) {
      this.disconnected = true;
    }),
    join: jest.fn(function (this: { joined: string[] }, room: string) {
      this.joined.push(room);
    }),
    disconnected: false,
    joined: [],
  } as unknown as Socket & { disconnected: boolean; joined: string[] };
}

describe('WaterMonitoringGateway', () => {
  let verifier: { verify: jest.Mock };
  let gateway: WaterMonitoringGateway;
  let emit: jest.Mock;
  let to: jest.Mock;

  beforeEach(() => {
    verifier = { verify: jest.fn() };
    gateway = new WaterMonitoringGateway(verifier as unknown as OidcTokenVerifier);
    emit = jest.fn();
    to = jest.fn().mockReturnValue({ emit });
    (gateway as unknown as { server: Server }).server = { to } as unknown as Server;
  });

  it('aceita conexao com token valido', async () => {
    verifier.verify.mockResolvedValue({ sub: 'u', roles: [] });
    const client = makeClient('valid');
    await gateway.handleConnection(client);
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('recusa conexao sem token', async () => {
    const client = makeClient();
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('recusa conexao com token invalido', async () => {
    verifier.verify.mockRejectedValue(new Error('invalid'));
    const client = makeClient('bad');
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('assina a unidade entrando na room correta', () => {
    const client = makeClient('valid');
    const res = gateway.handleSubscribe('data-center-sp-01', client);
    expect(client.join).toHaveBeenCalledWith('unit:data-center-sp-01');
    expect(res).toEqual({ subscribed: 'data-center-sp-01' });
  });

  it('publish emite o evento apenas para a room da unidade', () => {
    const event: ReadingEvent = {
      unitId: 'data-center-sp-01',
      sensorId: 's1',
      timestamp: '2026-11-01T22:05:30.000Z',
      valueInLiters: 100,
      readingType: 'sensor',
    };
    gateway.publish(event);
    expect(to).toHaveBeenCalledWith('unit:data-center-sp-01');
    expect(emit).toHaveBeenCalledWith('reading', event);
  });
});
