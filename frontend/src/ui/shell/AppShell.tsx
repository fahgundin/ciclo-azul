import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ROLE_LABELS } from '../../core/auth/roles';
import type { TokenUser } from '../../core/auth/token';
import { initials } from '../../core/format';
import { routesFor, type AppRoute } from '../../core/navigation/routes';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import './shell.css';

/** Paginas implementadas, indexadas pelo caminho da rota. */
export type PageRegistry = Readonly<Record<string, ReactElement>>;

interface AppShellProps {
  user: TokenUser;
  pages: PageRegistry;
  onLogout: () => void;
}

const APP_TITLE = 'Ciclo Azul';

/**
 * Casca do app autenticado: barra superior (titulo + conta), area de conteudo
 * com as rotas e navegacao inferior.
 *
 * So entram no menu e no roteador as telas que o perfil pode acessar (core/
 * navigation) E que ja tem pagina registrada. Qualquer outro caminho volta para
 * a pagina inicial, o que funciona como guarda de rotas.
 */
export function AppShell({ user, pages, onLogout }: AppShellProps): JSX.Element {
  const { pathname } = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);

  const navRoutes = useMemo(
    () => routesFor(user.roles).filter((route) => route.path in pages),
    [user.roles, pages],
  );
  const current = navRoutes.find((route) => route.path === pathname);

  useEffect(() => {
    document.title = current ? `${current.label} · ${APP_TITLE}` : APP_TITLE;
  }, [current]);

  return (
    <div className="app-shell app-shell--with-nav">
      <header className="app-topbar">
        <span className="app-topbar__logo" aria-hidden="true" />
        <p className="app-topbar__title">{current?.label ?? APP_TITLE}</p>
        <div className="app-topbar__spacer" />
        <button
          type="button"
          className="app-topbar__account"
          aria-label="Minha conta"
          onClick={() => setAccountOpen(true)}
        >
          {initials(user.name)}
        </button>
      </header>

      <main className="app-content">
        <Routes>
          {navRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={pages[route.path]} />
          ))}
          <Route path="/" element={<Home routes={navRoutes} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {navRoutes.length > 0 && (
        <nav className="app-nav" aria-label="Navegação principal">
          {navRoutes.map((route) => (
            <NavLink key={route.path} to={route.path} className="app-nav__item">
              <Icon name={route.icon} />
              <span>{route.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <Dialog open={accountOpen} title="Minha conta" onClose={() => setAccountOpen(false)}>
        <dl className="kv">
          <dt>Nome</dt>
          <dd>{user.name}</dd>
          {user.email && (
            <>
              <dt>E-mail</dt>
              <dd>{user.email}</dd>
            </>
          )}
          <dt>Perfil</dt>
          <dd>
            {user.roles.length > 0
              ? user.roles.map((role) => ROLE_LABELS[role]).join(', ')
              : 'Sem perfil atribuído'}
          </dd>
        </dl>
        <button
          type="button"
          className="btn btn--block"
          onClick={() => {
            setAccountOpen(false);
            onLogout();
          }}
        >
          <Icon name="logout" />
          Sair
        </button>
      </Dialog>
    </div>
  );
}

/** Pagina inicial: abre a primeira tela disponivel ou explica que ainda nao ha nenhuma. */
function Home({ routes }: { routes: readonly AppRoute[] }): JSX.Element {
  const [first] = routes;
  if (first) {
    return <Navigate to={first.path} replace />;
  }
  return (
    <section className="empty-state">
      <div className="glass empty-state__card">
        <h1>Em construção</h1>
        <p>As telas do seu perfil ainda não estão disponíveis nesta versão do app.</p>
      </div>
    </section>
  );
}
