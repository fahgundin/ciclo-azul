import { useCallback, useEffect, useRef, useState } from 'react';
import { OidcClient } from '../core/auth/oidc-client';
import { AuthSession } from '../core/auth/auth-session';
import { readOidcConfig } from '../core/auth/oidc-config';

const client = new OidcClient(readOidcConfig(import.meta.env));
const session = new AuthSession(window.localStorage);

export interface UseAuth {
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

/**
 * Hook de autenticacao (camada UI). Orquestra o fluxo OIDC usando o core/auth:
 * - login(): prepara PKCE, guarda verifier/state e redireciona ao Keycloak
 * - no retorno (/callback com ?code=), troca o code por token e o persiste
 * - expoe token/estado/logout para a UI
 */
export function useAuth(): UseAuth {
  const [token, setToken] = useState<string | null>(() => session.getToken());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledCallback = useRef(false);

  useEffect(() => {
    if (handledCallback.current) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code) {
      return;
    }
    handledCallback.current = true;

    const verifier = session.getPendingVerifier();
    const expectedState = session.getPendingState();
    if (!verifier || (expectedState && state && expectedState !== state)) {
      setError('Falha na validação do login. Tente novamente.');
      session.clearPending();
      return;
    }

    setLoading(true);
    client
      .exchangeCode(code, verifier)
      .then((tokens) => {
        session.setToken(tokens.accessToken);
        session.clearPending();
        setToken(tokens.accessToken);
        // Remove o ?code= da URL para nao reprocessar ao recarregar.
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch(() => setError('Não foi possível concluir o login.'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async () => {
    const req = await client.createAuthorizationRequest();
    session.savePending(req.codeVerifier, req.state);
    window.location.assign(req.url);
  }, []);

  const logout = useCallback(() => {
    session.clear();
    setToken(null);
  }, []);

  return {
    token,
    isAuthenticated: token !== null,
    loading,
    error,
    login,
    logout,
  };
}
