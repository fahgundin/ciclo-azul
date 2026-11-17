import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AUDIT_DISCLAIMER, InMemoryAuditLog, type AuditEntry } from '../../core/audit/audit';
import { FlashProvider } from '../components/Flash';
import { UserProvider } from '../UserContext';
import { AuditPage } from './AuditPage';

const NOW = new Date('2026-11-07T12:00:00.000Z');

const entries: AuditEntry[] = [
  {
    id: 1,
    at: '2026-11-01T10:00:00.000Z',
    actor: 'Ana Souza',
    action: 'user.create',
    detail: 'Diego Alves criado',
  },
  {
    id: 2,
    at: '2026-11-05T10:00:00.000Z',
    actor: 'Marina Costa',
    action: 'waste.register',
    detail: 'Lote L-0121 destinado',
  },
  {
    id: 3,
    at: '2026-11-06T10:00:00.000Z',
    actor: 'Marina Costa',
    action: 'limit.update',
    detail: 'Limite geral alterado',
  },
];

function setup(list: AuditEntry[] = entries) {
  const saveFile = vi.fn();
  const printReport = vi.fn();
  render(
    <FlashProvider>
      <UserProvider user={{ name: 'Ana Souza', email: 'ana@ciclo.azul', roles: ['administrador'] }}>
        <AuditPage
          log={new InMemoryAuditLog(list)}
          now={() => NOW}
          saveFile={saveFile}
          printReport={printReport}
        />
      </UserProvider>
    </FlashProvider>,
  );
  return { saveFile, printReport, user: userEvent.setup() };
}

const listed = () =>
  within(screen.getByRole('list', { name: 'Histórico de auditoria' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('AuditPage (RNF02)', () => {
  it('anota que sao dados de demonstracao e que nao ha como editar nem excluir', () => {
    setup();
    expect(screen.getAllByText(/Dados de demonstração/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Não há como editar nem excluir registros/)).toBeInTheDocument();
  });

  it('lista acao, autor, data e detalhe, do mais recente ao mais antigo', () => {
    setup();
    const items = listed();
    expect(items).toHaveLength(3);
    expect(items[0]).toContain('Limite alterado');
    expect(items[0]).toContain('Limite geral alterado');
    expect(items[0]).toContain('#3 · Marina Costa');
    expect(items[0]).toMatch(/06\/11\/2026/);
    expect(items[2]).toContain('Usuário criado');
  });

  it('e somente leitura: nao oferece editar, excluir nem retificar', () => {
    setup();
    expect(
      screen.queryByRole('button', { name: /excluir|apagar|editar|retificar|remover/i }),
    ).not.toBeInTheDocument();
  });

  it('filtra por acao', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Ação'), 'waste.register');
    expect(listed()).toHaveLength(1);
    expect(listed()[0]).toContain('Lote L-0121 destinado');
    expect(screen.getByText(/1 de 3 registro\(s\) com os filtros aplicados/)).toBeInTheDocument();
  });

  it('filtra por usuario', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Usuário'), 'Marina Costa');
    expect(listed()).toHaveLength(2);
  });

  it('filtra por periodo e permite limpar os filtros', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('De'), '2026-11-05');
    await user.type(screen.getByLabelText('Até'), '2026-11-05');
    expect(listed()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(listed()).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  it('sem resultado para os filtros, avisa e bloqueia a exportacao', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Ação'), 'auth.login');
    expect(screen.getByText('Nenhum registro com os filtros aplicados.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeDisabled();
  });

  it('historico vazio mostra a mensagem propria', () => {
    setup([]);
    expect(screen.getByText('Nenhum registro no histórico.')).toBeInTheDocument();
  });

  it('exporta o CSV so com o que esta listado, com o aviso de demonstracao', async () => {
    const { user, saveFile } = setup();
    await user.selectOptions(screen.getByLabelText('Usuário'), 'Marina Costa');
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    expect(saveFile).toHaveBeenCalledTimes(1);
    const [name, content, mime] = saveFile.mock.calls[0] as [string, string, string];
    expect(name).toBe('ciclo-azul-auditoria-2026-11-07.csv');
    expect(mime).toBe('text/csv;charset=utf-8');
    expect(content).toContain('Limite geral alterado');
    expect(content).toContain('Lote L-0121 destinado');
    expect(content).not.toContain('Diego Alves criado');
    expect(content).toContain(AUDIT_DISCLAIMER);
    expect(await screen.findByText('Arquivo CSV gerado.')).toBeInTheDocument();
  });

  it('exporta PDF pela impressao, com a tabela e o aviso na area de impressao', async () => {
    const { user, printReport } = setup();
    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }));
    expect(printReport).toHaveBeenCalledTimes(1);

    const printArea = document.querySelector('.print-area') as HTMLElement;
    expect(within(printArea).getAllByRole('row', { hidden: true })).toHaveLength(1 + 3);
    expect(printArea).toHaveTextContent(AUDIT_DISCLAIMER);
  });
});
