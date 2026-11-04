import { WasteTypeApi } from '../core/api/waste-type-api';
import { WasteTypesPage } from './WasteTypesPage';

/**
 * Raiz da UI web. Monta o "app shell" (barra de topo + conteudo) e a tela de
 * tipos de residuo (R07), injetando o WasteTypeApi de core/.
 *
 * Layout mobile-first: a barra de topo fixa da identidade de "app" no celular.
 * Token: por ora lido de localStorage ("access_token") em dev; o fluxo OIDC
 * completo (login via Keycloak) sera ligado numa proxima iteracao.
 */
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const api = new WasteTypeApi(apiUrl, () => localStorage.getItem('access_token'));

export function App(): JSX.Element {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="app-topbar__logo" aria-hidden="true" />
        <p className="app-topbar__title">Ciclo Azul</p>
      </header>
      <main className="app-content">
        <WasteTypesPage api={api} />
      </main>
    </div>
  );
}
