import { WasteTypeApi } from '../core/api/waste-type-api';
import { WasteTypesPage } from './WasteTypesPage';

/**
 * Raiz da UI web. Monta a tela de tipos de residuo (R07), injetando o
 * WasteTypeApi de core/.
 *
 * Token: por ora, lido de localStorage ("access_token") em dev. O fluxo OIDC
 * completo (login via Keycloak preenchendo esse token) sera ligado numa proxima
 * iteracao; o cliente de core/auth ja existe.
 */
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const api = new WasteTypeApi(apiUrl, () => localStorage.getItem('access_token'));

export function App(): JSX.Element {
  return (
    <main>
      <WasteTypesPage api={api} />
    </main>
  );
}
