import { useCallback, useMemo } from 'react';
import { SensorApi } from '../core/api/sensor-api';
import { WasteLotApi } from '../core/api/waste-lot-api';
import { WasteTypeApi } from '../core/api/waste-type-api';
import { WaterReadingApi } from '../core/api/water-reading-api';
import { WaterStatusApi } from '../core/api/water-status-api';
import { userFromToken } from '../core/auth/token';
import { RealtimeClient } from '../core/realtime/realtime-client';
import { defaultSocketFactory } from '../core/realtime/socket-factory';
import { ApiReportDataSource } from '../core/reports/report-data-source';
import { FlashProvider, useFlash } from './components/Flash';
import { LoginPage } from './LoginPage';
import { buildPages } from './pages';
import { AppShell } from './shell/AppShell';
import { UserProvider } from './UserContext';
import { useAuth } from './useAuth';
import { useSessionStores } from './useSessionStores';

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
  const waterStatusApi = useMemo(() => new WaterStatusApi(apiUrl, () => auth.token), [auth.token]);
  const createRealtime = useCallback(() => new RealtimeClient(apiUrl, defaultSocketFactory), []);
  const getToken = useCallback(() => auth.token, [auth.token]);
  const user = useMemo(() => userFromToken(auth.token), [auth.token]);
  // ADAPTERS EM MEMORIA (R03/R08): um conjunto por SESSAO (quem esta logado); somem
  // ao sair e ao recarregar, mas nao quando o token e renovado.
  const { limitStore, pendingLotStore } = useSessionStores(user ? (user.email ?? user.name) : null);
  const reportSource = useMemo(
    () => new ApiReportDataSource({ sensorApi, readingApi, lotApi, wasteApi: api }),
    [sensorApi, readingApi, lotApi, api],
  );
  const pages = useMemo(
    () =>
      buildPages({
        wasteApi: api,
        lotApi,
        reportSource,
        limitStore,
        pendingLotStore,
        waterStatusApi,
        createRealtime,
        getToken,
        sensorApi,
        readingApi,
      }),
    [
      api,
      lotApi,
      reportSource,
      limitStore,
      pendingLotStore,
      waterStatusApi,
      createRealtime,
      getToken,
      sensorApi,
      readingApi,
    ],
  );

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
        <UserProvider user={user}>
          <AppShell user={user} pages={pages} onLogout={logout} />
        </UserProvider>
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
