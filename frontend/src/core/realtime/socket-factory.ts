import { io } from 'socket.io-client';
import type { RealtimeSocket, SocketFactory } from './realtime-client';

/**
 * Factory padrao usando socket.io-client. O token vai no handshake (`auth.token`),
 * validado pelo gateway no backend. Isolada aqui para o RealtimeClient permanecer
 * testavel com um socket falso.
 */
export const defaultSocketFactory: SocketFactory = (url: string, token: string): RealtimeSocket => {
  const socket = io(url, { auth: { token }, transports: ['websocket'] });
  return {
    on: (event, handler) => socket.on(event, handler),
    emit: (event, payload) => {
      socket.emit(event, payload);
    },
    disconnect: () => {
      socket.disconnect();
    },
  };
};
