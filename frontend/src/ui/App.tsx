import { useCallback, useMemo } from 'react';
import { SensorApi } from '../core/api/sensor-api';
import { WasteLotApi } from '../core/api/waste-lot-api';
import { WasteTypeApi } from '../core/api/waste-type-api';
import { WaterReadingApi } from '../core/api/water-reading-api';
import { userFromToken } from '../core/auth/token';
import { FlashProvider, useFlash } from './components/Flash';
import { LoginPage } from './LoginPage';
import { buildPages } from './pages';
import { AppShell } from './shell/AppShell';
import { useAuth } from './useAuth';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Raiz da UI web. Precisa estar dentro de um Router (BrowserRouter em main.tsx).
 */
export function App(): JSX.Element {
  return (
    <FlashProvider>
      <AppContent />
    </FlashProvider>
  );
}

/**
 * Decide entre a area publica (convite para entrar) e o app autenticado (shell
 * com navegacao por perfil). O perfil vem das roles do access token (Keycloak).
 */
function AppContent(): JSX.Element {
  const auth = useAuth();
  const flash = useFlash();
  // O api le o token "ao vivo" via closure sobre auth.token.
  const api = useMemo(() => new WasteTypeApi(apiUrl, () => auth.token), [auth.token]);
  const lotApi = useMemo(() => new WasteLotApi(apiUrl, () => auth.token), [auth.token]);
  const sensorApi = useMemo(() => new SensorApi(apiUrl, () => auth.token), [auth.token]);
  const readingApi = useMemo(() => new WaterReadingApi(apiUrl, () => auth.token), [auth.token]);
  const pages = useMemo(
    () => buildPages({ wasteApi: api, lotApi, sensorApi, readingApi }),
    [api, lotApi, sensorApi, readingApi],
  );
  const user = useMemo(() => userFromToken(auth.token), [auth.token]);

  const logout = useCallback(() => {
    auth.logout();
    flash('Sessão encerrada.');
  }, [auth, flash]);

  if (user) {
    return (
      <>
        {auth.error && (
          <p className="waste-alert" role="alert" style={{ margin: 'var(--space-2)' }}>
            {auth.error}
          </p>
        )}
        <AppShell user={user} pages={pages} onLogout={logout} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="app-topbar__logo" aria-hidden="true" />
        <p className="app-topbar__title">Ciclo Azul</p>
        <div className="app-topbar__spacer" />
        <button className="app-topbar__action" onClick={() => void auth.login()}>
          Entrar
        </button>
      </header>

      <main className="app-content">
        {auth.error && (
          <p className="waste-alert" role="alert" style={{ margin: 'var(--space-2)' }}>
            {auth.error}
          </p>
        )}
        <LoginPage onLogin={() => void auth.login()} loading={auth.loading} />
      </main>
    </div>
  );
}
