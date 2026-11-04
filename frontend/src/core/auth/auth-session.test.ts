import { describe, it, expect, vi, afterEach } from 'vitest';
import { OidcClient } from './oidc-client';
import { AuthSession, type SessionStorageLike } from './auth-session';

const config = {
  issuer: 'http://localhost:8080/realms/ciclo-azul',
  clientId: 'ciclo-azul-web',
  redirectUri: 'http://localhost:5173/callback',
};

/** Storage em memoria para testar a sessao sem depender do browser. */
function memStorage(): SessionStorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('OidcClient.exchangeCode', () => {
  afterEach(() => vi.restoreAllMocks());

  it('troca o code por token enviando code_verifier (PKCE)', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'abc', refresh_token: 'ref', expires_in: 300 }),
    });
    vi.stubGlobal('fetch', fetchFn);

    const client = new OidcClient(config);
    const tokens = await client.exchangeCode('code-123', 'verifier-xyz');

    expect(tokens.accessToken).toBe('abc');
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toContain('/protocol/openid-connect/token');
    expect(options.body).toContain('code=code-123');
    expect(options.body).toContain('code_verifier=verifier-xyz');
    expect(options.body).toContain('grant_type=authorization_code');
  });

  it('lanca erro quando a troca falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    const client = new OidcClient(config);
    await expect(client.exchangeCode('x', 'y')).rejects.toThrow('400');
  });
});

describe('AuthSession', () => {
  it('guarda e le o token; isAuthenticated reflete o estado', () => {
    const session = new AuthSession(memStorage());
    expect(session.isAuthenticated()).toBe(false);
    session.setToken('tok');
    expect(session.getToken()).toBe('tok');
    expect(session.isAuthenticated()).toBe(true);
  });

  it('guarda e limpa os dados transientes do PKCE', () => {
    const session = new AuthSession(memStorage());
    session.savePending('verifier', 'state');
    expect(session.getPendingVerifier()).toBe('verifier');
    expect(session.getPendingState()).toBe('state');
    session.clearPending();
    expect(session.getPendingVerifier()).toBeNull();
  });

  it('clear encerra a sessao (logout local)', () => {
    const session = new AuthSession(memStorage());
    session.setToken('tok');
    session.savePending('v', 's');
    session.clear();
    expect(session.getToken()).toBeNull();
    expect(session.getPendingVerifier()).toBeNull();
  });
});
