import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

/** Componente minimo que expoe o estado do hook para o teste. */
function Probe() {
  const auth = useAuth();
  return <span data-testid="state">{auth.isAuthenticated ? 'in' : 'out'}</span>;
}

describe('useAuth (callback OIDC)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => vi.restoreAllMocks());

  it('comeca deslogado quando nao ha token nem code', () => {
    render(<Probe />);
    expect(screen.getByTestId('state')).toHaveTextContent('out');
  });

  it('troca o code por token no callback e fica autenticado', async () => {
    // Simula o estado deixado pelo inicio do login (PKCE) + o retorno com ?code=
    window.localStorage.setItem('ciclo-azul.pkce_verifier', 'verifier-xyz');
    window.localStorage.setItem('ciclo-azul.oauth_state', 'st');
    window.history.replaceState({}, '', '/callback?code=abc&state=st');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'token-123' }),
      }),
    );

    render(<Probe />);

    await waitFor(() => {
      expect(screen.getByTestId('state')).toHaveTextContent('in');
    });
    expect(window.localStorage.getItem('ciclo-azul.access_token')).toBe('token-123');
  });
});
