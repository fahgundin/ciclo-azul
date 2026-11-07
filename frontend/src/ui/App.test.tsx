import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { makeTokenWithRoles } from '../test-utils';
import { App } from './App';

const TOKEN_KEY = 'ciclo-azul.access_token';

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function login(roles: string[], claims: Record<string, unknown> = {}) {
  window.localStorage.setItem(
    TOKEN_KEY,
    makeTokenWithRoles(roles, { name: 'Marina Costa', email: 'marina@ciclo.azul', ...claims }),
  );
}

describe('App', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sem login mostra o convite para entrar, sem menu', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Bem-vindo ao Ciclo Azul' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Entrar' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('token ilegivel e tratado como sem login', () => {
    window.localStorage.setItem(TOKEN_KEY, 'lixo');
    renderApp();
    expect(screen.getByRole('heading', { name: 'Bem-vindo ao Ciclo Azul' })).toBeInTheDocument();
  });

  it('Gestor Ambiental logado cai em Residuos (lotes) e carrega os dados com o token', async () => {
    login(['gestor-ambiental']);
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Destinação de lotes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Resíduos' })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('/waste-lots'))).toBe(true);
    expect(urls.some((url) => url.includes('/waste-types'))).toBe(true);
  });

  it('o retorno do login (/callback) com sessao ativa abre a primeira tela', async () => {
    login(['gestor-ambiental']);
    renderApp('/callback');
    expect(await screen.findByRole('heading', { name: 'Destinação de lotes' })).toBeInTheDocument();
  });

  it('Operador logado cai em Sensores e carrega os sensores com o token', async () => {
    login(['operador']);
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Sensores IoT' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sensores' })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/sensors');
  });

  it('perfil sem telas prontas (Diretoria) ve "Em construcao" e nao chama a API', () => {
    login(['diretoria']);
    renderApp();
    expect(screen.getByRole('heading', { name: 'Em construção' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Sair encerra a sessao, volta ao convite e avisa', async () => {
    login(['gestor-ambiental']);
    renderApp();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Destinação de lotes' });

    await user.click(screen.getByRole('button', { name: 'Minha conta' }));
    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(screen.getByRole('heading', { name: 'Bem-vindo ao Ciclo Azul' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sessão encerrada.');
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
