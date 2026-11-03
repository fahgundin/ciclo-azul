import {
  READING_EVENT,
  SUBSCRIBE_UNIT_EVENT,
  type ReadingEvent,
} from '@ciclo-azul/contracts';

/** Interface minima de socket que o cliente usa (compativel com socket.io-client). */
export interface RealtimeSocket {
  on(event: string, handler: (payload: unknown) => void): void;
  emit(event: string, payload: unknown): void;
  disconnect(): void;
}

/** Fabrica de socket: permite injetar um socket real ou um fake (testes). */
export type SocketFactory = (url: string, token: string) => RealtimeSocket;

/**
 * Cliente de tempo real (WebSocket) da camada core/ — agnostico de UI.
 *
 * Conecta ao backend com o token OIDC, assina uma unidade e entrega as leituras
 * aos handlers registrados. A UI apenas consome; nada de core/ importa de ui/.
 */
export class RealtimeClient {
  private socket?: RealtimeSocket;
  private readonly handlers = new Set<(event: ReadingEvent) => void>();

  constructor(
    private readonly url: string,
    private readonly createSocket: SocketFactory,
  ) {}

  /** Conecta usando o token e passa a escutar o evento de leitura. */
  connect(token: string): void {
    this.socket = this.createSocket(this.url, token);
    this.socket.on(READING_EVENT, (payload) => {
      const event = payload as ReadingEvent;
      for (const handler of this.handlers) {
        handler(event);
      }
    });
  }

  /** Assina as leituras de uma unidade. */
  subscribeUnit(unitId: string): void {
    this.socket?.emit(SUBSCRIBE_UNIT_EVENT, unitId);
  }

  /** Registra um handler para novas leituras; retorna funcao para cancelar. */
  onReading(handler: (event: ReadingEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.handlers.clear();
  }
}
