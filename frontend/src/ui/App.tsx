import { useMemo } from 'react';
import { WasteTypeApi } from '../core/api/waste-type-api';
import { WasteTypesPage } from './WasteTypesPage';
import { useAuth } from './useAuth';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Raiz da UI web. App shell (barra de topo + conteudo) com estado de login.
 *
 * O token vem da sessao OIDC (useAuth) e e injetado no WasteTypeApi, que o envia
 * em cada chamada. Sem login, a tela convida a entrar.
 */
export function App(): JSX.Element {
  const auth = useAuth();
  // O api le o token "ao vivo" via closure sobre auth.token.
  const api = useMemo(() => new WasteTypeApi(apiUrl, () => auth.token), [auth.token]);

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="app-topbar__logo" aria-hidden="true" />
        <p className="app-topbar__title">Ciclo Azul</p>
        <div className="app-topbar__spacer" />
        {auth.isAuthenticated ? (
          <button className="app-topbar__action" onClick={auth.logout}>
            Sair
          </button>
        ) : (
          <button className="app-topbar__action" onClick={() => void auth.login()}>
            Entrar
          </button>
        )}
      </header>

      <main className="app-content">
        {auth.error && (
          <p className="waste-alert" role="alert" style={{ margin: 'var(--space-2)' }}>
            {auth.error}
          </p>
        )}

        {auth.isAuthenticated ? (
          <WasteTypesPage api={api} />
        ) : (
          <section className="waste-page">
            <div className="glass waste-card">
              <h1>Bem-vindo ao Ciclo Azul</h1>
              <p>Entre para gerenciar os tipos de resíduo da operação.</p>
              <button
                className="login-cta"
                onClick={() => void auth.login()}
                disabled={auth.loading}
              >
                {auth.loading ? 'Entrando…' : 'Entrar'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
