import { Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  READING_EVENT,
  SUBSCRIBE_UNIT_EVENT,
  unitRoom,
  type ReadingEvent,
} from '@ciclo-azul/contracts';
import { OidcTokenVerifier } from '../../../../auth/oidc-token.verifier';
import type { ReadingPublisher } from '../../application/reading-publisher';

/**
 * Gateway WebSocket (socket.io) do monitoramento em tempo real (R05).
 *
 * - Autentica o cliente no HANDSHAKE validando o token OIDC (reusa a F3).
 *   Conexao sem token valido e recusada.
 * - O cliente assina uma unidade (evento `subscribe-unit`), entrando na room
 *   `unit:<unitId>`.
 * - Implementa ReadingPublisher: ao receber uma leitura nova, emite `reading`
 *   apenas para a room da unidade correspondente.
 *
 * CORS do WS restrito a origem da aplicacao (WEB_APP_ORIGIN).
 */
@WebSocketGateway({
  cors: { origin: process.env.WEB_APP_ORIGIN ?? 'http://localhost:5173' },
})
export class WaterMonitoringGateway implements OnGatewayConnection, ReadingPublisher {
  private readonly logger = new Logger(WaterMonitoringGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly verifier: OidcTokenVerifier) {}

  /** Valida o token no handshake; desconecta se ausente/invalido. */
  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn('WS: conexao sem token recusada');
      client.disconnect(true);
      return;
    }
    try {
      await this.verifier.verify(token);
    } catch {
      this.logger.warn('WS: token invalido, conexao recusada');
      client.disconnect(true);
    }
  }

  /** Cliente assina as leituras de uma unidade. */
  @SubscribeMessage(SUBSCRIBE_UNIT_EVENT)
  handleSubscribe(
    @MessageBody() unitId: string,
    @ConnectedSocket() client: Socket,
  ): { subscribed: string } {
    client.join(unitRoom(unitId));
    return { subscribed: unitId };
  }

  /** ReadingPublisher: emite a leitura para a room da unidade. */
  publish(event: ReadingEvent): void {
    this.server?.to(unitRoom(event.unitId)).emit(READING_EVENT, event);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) {
      return auth.token;
    }
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    return null;
  }
}
