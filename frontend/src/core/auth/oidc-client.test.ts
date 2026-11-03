import { describe, it, expect } from 'vitest';
import { OidcClient } from './oidc-client';
import { deriveCodeChallenge, generateCodeVerifier } from './pkce';
import { readOidcConfig } from './oidc-config';

const config = {
  issuer: 'http://localhost:8080/realms/ciclo-azul',
  clientId: 'ciclo-azul-web',
  redirectUri: 'http://localhost:5173/callback',
};

describe('core/auth — OIDC + PKCE', () => {
  it('gera code_verifier no tamanho pedido', () => {
    expect(generateCodeVerifier(64)).toHaveLength(64);
  });

  it('deriva code_challenge S256 estavel para o mesmo verifier', async () => {
    const c1 = await deriveCodeChallenge('verifier-fixo');
    const c2 = await deriveCodeChallenge('verifier-fixo');
    expect(c1).toBe(c2);
    expect(c1).not.toContain('='); // base64url sem padding
    expect(c1).not.toContain('+');
    expect(c1).not.toContain('/');
  });

  it('monta a URL de autorizacao com os parametros de PKCE', async () => {
    const client = new OidcClient(config);
    const req = await client.createAuthorizationRequest();
    const url = new URL(req.url);

    expect(url.origin + url.pathname).toBe(
      'http://localhost:8080/realms/ciclo-azul/protocol/openid-connect/auth',
    );
    expect(url.searchParams.get('client_id')).toBe('ciclo-azul-web');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('state')).toBe(req.state);
    expect(req.codeVerifier).toBeTruthy();
  });

  it('readOidcConfig aplica defaults quando env esta vazio', () => {
    const cfg = readOidcConfig({} as ImportMetaEnv);
    expect(cfg.clientId).toBe('ciclo-azul-web');
    expect(cfg.issuer).toContain('/realms/ciclo-azul');
  });
});
