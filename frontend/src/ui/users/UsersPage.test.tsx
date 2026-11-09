import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UnitConsumptionStatus } from '@ciclo-azul/contracts';
import { PERMISSION_LABELS, PERMISSIONS } from '../../core/auth/permissions';
import { InMemoryUserDirectory } from '../../core/users/users';
import { FlashProvider } from '../components/Flash';
import { UserProvider } from '../UserContext';
import { UsersPage } from './UsersPage';

const status = (unitId: string): UnitConsumptionStatus => ({
  unitId,
  state: 'live',
  currentValueInLiters: 1,
  lastReadingAt: null,
  lastReadingType: null,
  staleAfterMinutes: 15,
});

function setup({
  directory = new InMemoryUserDirectory(),
  list = vi.fn().mockResolvedValue(['dc-sp1', 'dc-cps', 'dc-for', 'dc-rj'].map(status)),
  email = 'ana@ciclo.azul' as string | null,
} = {}) {
  render(
    <FlashProvider>
      <UserProvider user={{ name: 'Ana Souza', email, roles: ['administrador'] }}>
        <UsersPage directory={directory} statusApi={{ list }} />
      </UserProvider>
    </FlashProvider>,
  );
  return { directory, user: userEvent.setup() };
}

describe('UsersPage (R01 / HU01)', () => {
  it('anota que o cadastro e de demonstracao e que o Keycloak guarda as contas reais', () => {
    setup();
    expect(screen.getByText(/Cadastro de demonstração/)).toBeInTheDocument();
    expect(screen.getByText(/Keycloak/)).toBeInTheDocument();
  });

  it('lista os usuarios com perfil, unidades do Operador e marca o proprio usuario', () => {
    setup();
    const list = screen.getByRole('list', { name: 'Usuários' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    expect(within(list).getByText('Ana Souza (você)')).toBeInTheDocument();
    const diego = screen.getByRole('button', { name: 'Editar Diego Alves' });
    expect(diego).toHaveTextContent('Operador de Infraestrutura');
    expect(diego).toHaveTextContent('Unidades: dc-sp1, dc-cps');
  });

  it('mostra a matriz de permissoes somente leitura', () => {
    setup();
    const table = screen.getByRole('table');
    const row = within(table)
      .getByRole('rowheader', { name: PERMISSION_LABELS[PERMISSIONS.USERS_MANAGE] })
      .closest('tr') as HTMLElement;
    // Administrador, Gestor, Operador, Diretoria
    expect(
      within(row)
        .getAllByRole('cell')
        .map((c) => c.getAttribute('aria-label')),
    ).toEqual(['Sim', 'Não', 'Não', 'Não']);
    expect(within(table).queryByRole('checkbox')).not.toBeInTheDocument();
  });

  // Cenario: Criar um novo usuario com perfil definido
  it('cria um usuario Operador com unidades e o lista', async () => {
    const { user, directory } = setup();
    await user.click(screen.getByRole('button', { name: 'Novo usuário' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo usuário' });

    await user.type(within(dialog).getByLabelText('Nome completo'), 'Carla Dias');
    await user.type(within(dialog).getByLabelText('E-mail'), 'carla@ciclo.azul');
    expect(within(dialog).getByLabelText('Nível de acesso')).toHaveValue('operador');
    await user.click(within(dialog).getByRole('checkbox', { name: 'dc-rj' }));
    await user.click(within(dialog).getByRole('button', { name: 'Criar usuário' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Usuário criado.');
    expect(directory.list().find((u) => u.email === 'carla@ciclo.azul')).toMatchObject({
      role: 'operador',
      unitIds: ['dc-rj'],
      active: true,
    });
    expect(screen.getByRole('button', { name: 'Editar Carla Dias' })).toHaveTextContent(
      'Unidades: dc-rj',
    );
  });

  it('mostra os erros do cadastro sem criar o usuario', async () => {
    const { user, directory } = setup();
    await user.click(screen.getByRole('button', { name: 'Novo usuário' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo usuário' });
    await user.type(within(dialog).getByLabelText('E-mail'), 'ana@ciclo.azul');
    await user.click(within(dialog).getByRole('button', { name: 'Criar usuário' }));

    expect(within(dialog).getByText('Informe o nome completo.')).toBeInTheDocument();
    expect(within(dialog).getByText('Já existe um usuário com este e-mail.')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Selecione ao menos uma unidade para o Operador.'),
    ).toBeInTheDocument();
    expect(directory.list()).toHaveLength(6);
  });

  it('unidades so aparecem para o perfil Operador', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Novo usuário' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo usuário' });
    expect(
      within(dialog).getByRole('group', { name: 'Unidades sob responsabilidade' }),
    ).toBeVisible();
    await user.selectOptions(within(dialog).getByLabelText('Nível de acesso'), 'diretoria');
    expect(within(dialog).queryByRole('group')).not.toBeInTheDocument();
  });

  it('edita o nivel e desativa a conta de outro usuario', async () => {
    const { user, directory } = setup();
    await user.click(screen.getByRole('button', { name: 'Editar Rafael Lima' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rafael Lima' });
    await user.selectOptions(within(dialog).getByLabelText('Nível de acesso'), 'diretoria');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Conta ativa' }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Usuário atualizado.');
    expect(directory.list().find((u) => u.id === 'u-rafael')).toMatchObject({
      role: 'diretoria',
      active: false,
    });
    expect(screen.getByRole('button', { name: 'Editar Rafael Lima' })).toHaveTextContent('Inativo');
  });

  it('Operador sem nenhuma unidade nao pode ser salvo', async () => {
    const { user, directory } = setup();
    await user.click(screen.getByRole('button', { name: 'Editar Paulo Nunes' }));
    const dialog = await screen.findByRole('dialog', { name: 'Paulo Nunes' });
    await user.click(within(dialog).getByRole('checkbox', { name: 'dc-for' }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    expect(
      within(dialog).getByText('Selecione ao menos uma unidade para o Operador.'),
    ).toBeInTheDocument();
    expect(directory.list().find((u) => u.id === 'u-paulo')?.unitIds).toEqual(['dc-for']);
  });

  it('o proprio usuario nao altera o proprio nivel nem se desativa', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Editar Ana Souza' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ana Souza' });
    expect(within(dialog).getByLabelText('Nível de acesso')).toBeDisabled();
    expect(within(dialog).getByRole('checkbox', { name: 'Conta ativa' })).toBeDisabled();
    expect(
      within(dialog).getByText(/não pode alterar o próprio nível de acesso nem desativar/),
    ).toBeInTheDocument();
  });

  it('se as unidades nao carregarem, ainda oferece as ja atribuidas e avisa', async () => {
    const { user } = setup({ list: vi.fn().mockRejectedValue(new Error('falha')) });
    await user.click(screen.getByRole('button', { name: 'Editar Diego Alves' }));
    const dialog = await screen.findByRole('dialog', { name: 'Diego Alves' });
    expect(within(dialog).getByRole('checkbox', { name: 'dc-sp1' })).toBeChecked();
    expect(within(dialog).queryByRole('checkbox', { name: 'dc-rj' })).not.toBeInTheDocument();
  });
});
