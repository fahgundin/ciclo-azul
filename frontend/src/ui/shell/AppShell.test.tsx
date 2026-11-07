import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { APP_ROLES, type AppRole } from '../../core/auth/roles';
import type { TokenUser } from '../../core/auth/token';
import { useUser } from '../UserContext';
import { AppShell, type PageRegistry } from './AppShell';

const pages: PageRegistry = {
  '/agua': <p>Página de água</p>,
  '/residuos': <p>Página de resíduos</p>,
  '/usuarios': <p>Página de usuários</p>,
};

function userWith(roles: AppRole[], overrides: Partial<TokenUser> = {}): TokenUser {
  return { name: 'Marina Costa', email: 'marina@ciclo.azul', roles, ...overrides };
}

function renderShell(
  user: TokenUser,
  path = '/',
  { onLogout = vi.fn(), registry = pages }: { onLogout?: () => void; registry?: PageRegistry } = {},
) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell user={user} pages={registry} onLogout={onLogout} />
    </MemoryRouter>,
  );
  return { onLogout };
}

const topbarTitle = () => within(screen.getByRole('banner')).getByText(/./, { selector: 'p' });
const navLinks = () =>
  within(screen.getByRole('navigation', { name: 'Navegação principal' }))
    .getAllByRole('link')
    .map((link) => link.textContent);

describe('AppShell — navegacao por perfil', () => {
  it('Gestor Ambiental ve Agua e Residuos, nao ve Usuarios', () => {
    renderShell(userWith([APP_ROLES.GESTOR_AMBIENTAL]));
    expect(navLinks()).toEqual(['Água', 'Resíduos']);
  });

  it('Administrador ve apenas Usuarios', () => {
    renderShell(userWith([APP_ROLES.ADMINISTRADOR]));
    expect(navLinks()).toEqual(['Usuários']);
  });

  it('Operador ve apenas Agua (nao ha pagina de Sensores registrada)', () => {
    renderShell(userWith([APP_ROLES.OPERADOR]));
    expect(navLinks()).toEqual(['Água']);
  });

  it('nao mostra no menu telas sem pagina registrada', () => {
    renderShell(userWith([APP_ROLES.GESTOR_AMBIENTAL]), '/', {
      registry: { '/residuos': <p>Página de resíduos</p> },
    });
    expect(navLinks()).toEqual(['Resíduos']);
  });

  it('a pagina inicial abre a primeira tela disponivel do perfil', () => {
    renderShell(userWith([APP_ROLES.GESTOR_AMBIENTAL]));
    expect(screen.getByText('Página de água')).toBeInTheDocument();
    expect(topbarTitle()).toHaveTextContent('Água');
  });

  it('marca o item ativo do menu e atualiza titulo da barra e da aba', () => {
    renderShell(userWith([APP_ROLES.GESTOR_AMBIENTAL]), '/residuos');
    expect(screen.getByRole('link', { name: 'Resíduos' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Água' })).not.toHaveAttribute('aria-current');
    expect(topbarTitle()).toHaveTextContent('Resíduos');
    expect(document.title).toBe('Resíduos · Ciclo Azul');
  });

  it('troca de tela ao tocar num item do menu', async () => {
    renderShell(userWith([APP_ROLES.GESTOR_AMBIENTAL]), '/agua');
    await userEvent.setup().click(screen.getByRole('link', { name: 'Resíduos' }));
    expect(screen.getByText('Página de resíduos')).toBeInTheDocument();
    expect(screen.queryByText('Página de água')).not.toBeInTheDocument();
  });
});

describe('AppShell — guarda de rotas', () => {
  it('rota de outro perfil volta para a primeira tela permitida', () => {
    renderShell(userWith([APP_ROLES.OPERADOR]), '/usuarios');
    expect(screen.queryByText('Página de usuários')).not.toBeInTheDocument();
    expect(screen.getByText('Página de água')).toBeInTheDocument();
  });

  it('rota existente mas sem permissao nao renderiza a pagina', () => {
    renderShell(userWith([APP_ROLES.OPERADOR]), '/residuos');
    expect(screen.queryByText('Página de resíduos')).not.toBeInTheDocument();
  });

  it('caminho desconhecido (ex.: /callback) cai na pagina inicial', () => {
    renderShell(userWith([APP_ROLES.GESTOR_AMBIENTAL]), '/callback');
    expect(screen.getByText('Página de água')).toBeInTheDocument();
  });

  it('perfil sem telas disponiveis ve "Em construcao" e nao ve menu', () => {
    renderShell(userWith([APP_ROLES.DIRETORIA]));
    expect(screen.getByRole('heading', { name: 'Em construção' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(document.title).toBe('Ciclo Azul');
  });

  it('usuario sem nenhum perfil conhecido ve "Em construcao"', () => {
    renderShell(userWith([]));
    expect(screen.getByRole('heading', { name: 'Em construção' })).toBeInTheDocument();
  });
});

describe('AppShell — conta do usuario', () => {
  it('mostra as iniciais no botao da conta', () => {
    renderShell(userWith([APP_ROLES.GESTOR_AMBIENTAL]));
    expect(screen.getByRole('button', { name: 'Minha conta' })).toHaveTextContent('MC');
  });

  it('abre o dialogo com nome, e-mail e perfil', async () => {
    renderShell(userWith([APP_ROLES.GESTOR_AMBIENTAL]));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Minha conta' }));

    const dialog = screen.getByRole('dialog', { name: 'Minha conta' });
    expect(within(dialog).getByText('Marina Costa')).toBeInTheDocument();
    expect(within(dialog).getByText('marina@ciclo.azul')).toBeInTheDocument();
    expect(within(dialog).getByText('Gestor Ambiental')).toBeInTheDocument();
  });

  it('omite o e-mail quando o token nao tem e avisa quando nao ha perfil', async () => {
    renderShell(userWith([], { email: null }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Minha conta' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('E-mail')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Sem perfil atribuído')).toBeInTheDocument();
  });

  it('lista todos os perfis do usuario', async () => {
    renderShell(userWith([APP_ROLES.OPERADOR, APP_ROLES.DIRETORIA]));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Minha conta' }));
    expect(screen.getByText('Operador de Infraestrutura, Diretoria')).toBeInTheDocument();
  });

  it('Sair fecha o dialogo e chama onLogout', async () => {
    const { onLogout } = renderShell(userWith([APP_ROLES.GESTOR_AMBIENTAL]));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Minha conta' }));
    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('AppShell — usuario para as paginas', () => {
  it('disponibiliza o usuario autenticado via useUser()', () => {
    function WhoAmI() {
      return <p>Logada: {useUser()?.name}</p>;
    }
    renderShell(userWith([APP_ROLES.GESTOR_AMBIENTAL]), '/agua', {
      registry: { '/agua': <WhoAmI /> },
    });
    expect(screen.getByText('Logada: Marina Costa')).toBeInTheDocument();
  });
});
