import { useState } from 'react';
import { InMemoryLimitStore, type LimitStore } from '../core/limits/limits';
import { InMemoryAppliedStore, type AppliedStore } from '../core/reuse/opportunities';
import { InMemoryUserDirectory, type UserDirectory } from '../core/users/users';
import { InMemoryPendingLotStore, type PendingLotStore } from '../core/waste/pending-lot';

/** ADAPTERS EM MEMORIA (R01, R02, R03, R08): um conjunto por sessao de login. */
export interface SessionStores {
  limitStore: LimitStore;
  pendingLotStore: PendingLotStore;
  appliedStore: AppliedStore;
  userDirectory: UserDirectory;
}

function createSessionStores(): SessionStores {
  return {
    limitStore: new InMemoryLimitStore(),
    pendingLotStore: new InMemoryPendingLotStore(),
    appliedStore: new InMemoryAppliedStore(),
    userDirectory: new InMemoryUserDirectory(),
  };
}

/**
 * Adapters em memoria da sessao. A sessao e identificada por `sessionKey` (quem esta
 * logado; `null` = ninguem): ao sair ou trocar de usuario o conjunto e recriado, e a
 * renovacao do token NAO apaga limites nem lotes no meio da sessao.
 */
export function useSessionStores(sessionKey: string | null): SessionStores {
  const [state, setState] = useState(() => ({ sessionKey, stores: createSessionStores() }));
  if (state.sessionKey === sessionKey) {
    return state.stores;
  }
  // Troca de sessao: recria durante a renderizacao (padrao do React para derivar estado).
  const next = { sessionKey, stores: createSessionStores() };
  setState(next);
  return next.stores;
}
