import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WasteLotView, WasteTypeView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { WasteLotApi } from '../../core/api/waste-lot-api';
import type { WasteTypeApi } from '../../core/api/waste-type-api';
import { InMemoryPendingLotStore, type PendingLotStore } from '../../core/waste/pending-lot';
import { FlashProvider } from '../components/Flash';
import { WasteLotsPanel } from './WasteLotsPanel';

const NOW = new Date(2026, 10, 5, 12, 0);
const TYPES: WasteTypeView[] = [
  { id: 'wt-1', name: 'Óleo de refrigeração', classification: 'Metal pesado' },
  { id: 'wt-2', name: 'Baterias chumbo-ácido', classification: 'Metal pesado' },
];

const lot = (id: string, over: Partial<WasteLotView> = {}): WasteLotView => ({
  id,
  wasteTypeId: 'wt-1',
  location: 'Paulínia/SP',
  receiverCompany: 'EcoQuímica Ambiental',
  license: 'LO-2043/2025',
  date: '2026-11-05T00:00:00.000Z',
  quantity: 800,
  proofReference: 'mtr-0140.pdf',
  status: 'destined',
  ...over,
});

function setup({
  lots = [] as WasteLotView[],
  list = vi.fn().mockResolvedValue(lots),
  register = vi.fn(),
  types = vi.fn().mockResolvedValue(TYPES),
  pendingStore = new InMemoryPendingLotStore() as PendingLotStore,
} = {}) {
  const lotApi = { list, register } as unknown as WasteLotApi;
  const wasteApi = { list: types } as unknown as WasteTypeApi;
  render(
    <FlashProvider>
      <WasteLotsPanel
        lotApi={lotApi}
        wasteApi={wasteApi}
        pendingStore={pendingStore}
        now={() => NOW}
      />
    </FlashProvider>,
  );
  return { list, register, pendingStore, user: userEvent.setup() };
}

describe('WasteLotsPanel (R06)', () => {
  it('lista os lotes do mais recente ao mais antigo, com nome do tipo, data UTC e etiqueta Destinado', async () => {
    setup({
      lots: [
        lot('a', { date: '2026-10-01T00:00:00.000Z', quantity: 90.5, wasteTypeId: 'wt-2' }),
        lot('b', { date: '2026-11-05T00:00:00.000Z', quantity: 1234 }),
      ],
    });

    const list = await screen.findByRole('list', { name: 'Lotes com destinação registrada' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Óleo de refrigeração');
    expect(items[0]).toHaveTextContent('Quantidade 1.234');
    expect(items[0]).toHaveTextContent('05/11/2026');
    expect(items[0]).toHaveTextContent('EcoQuímica Ambiental');
    expect(items[0]).toHaveTextContent('Licença LO-2043/2025');
    expect(items[0]).toHaveTextContent('Comprovante: mtr-0140.pdf');
    expect(items[0]).toHaveTextContent('Destinado');
    expect(items[1]).toHaveTextContent('Baterias chumbo-ácido');
    expect(items[1]).toHaveTextContent('Quantidade 90,5');
    expect(items[1]).toHaveTextContent('01/10/2026');
  });

  it('mostra um nome padrao quando o tipo do lote nao existe mais', async () => {
    setup({ lots: [lot('a', { wasteTypeId: 'sumiu' })] });
    expect(await screen.findByText('Tipo de resíduo removido')).toBeInTheDocument();
  });

  it('mostra estado vazio sem lotes', async () => {
    setup();
    expect(
      await screen.findByText('Nenhum lote com destinação registrada ainda.'),
    ).toBeInTheDocument();
  });

  it('mostra o erro de carregamento do backend', async () => {
    setup({ list: vi.fn().mockRejectedValue(new ApiError('Erro 403', 403)) });
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro 403');
    expect(
      screen.queryByText('Nenhum lote com destinação registrada ainda.'),
    ).not.toBeInTheDocument();
  });

  it('registra uma destinacao, avisa que o lote consta como Destinado e recarrega a lista', async () => {
    const created = lot('novo', {
      location: 'Cubatão/SP',
      receiverCompany: 'Recicla Metais Brasil',
    });
    const list = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([created]);
    const { register, user } = setup({ list, register: vi.fn().mockResolvedValue(created) });
    await screen.findByText('Nenhum lote com destinação registrada ainda.');

    await user.click(screen.getByRole('button', { name: 'Registrar destinação' }));
    const dialog = screen.getByRole('dialog', { name: 'Registrar destinação' });
    await user.selectOptions(within(dialog).getByLabelText('Tipo de resíduo'), 'wt-1');
    await user.type(within(dialog).getByLabelText('Local da destinação'), 'Cubatão/SP');
    await user.type(within(dialog).getByLabelText('Empresa receptora'), 'Recicla Metais Brasil');
    await user.type(within(dialog).getByLabelText('Licença da empresa'), 'LO-8812/2024');
    await user.type(within(dialog).getByLabelText('Quantidade destinada'), '280');
    await user.type(within(dialog).getByLabelText(/Comprovante de destinação/), 'mtr-0112.pdf');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar destinação' }));

    expect(register).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Recicla Metais Brasil · Cubatão/SP')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Destinação registrada. O lote consta como Destinado.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('WasteLotsPanel — lotes aguardando destinacao (R08, adapter em memoria)', () => {
  const T0 = new Date(2026, 10, 1, 12, 0);

  it('anota que os lotes pendentes ficam so neste navegador', async () => {
    setup();
    expect(await screen.findByText(/adapter em memória/)).toBeInTheDocument();
    expect(screen.getByText('Nenhum lote aguardando destinação.')).toBeInTheDocument();
  });

  it('cria um lote pendente com o prazo e a etiqueta "No prazo"', async () => {
    const { pendingStore, user } = setup();
    await screen.findByText('Nenhum lote aguardando destinação.');

    await user.click(screen.getByRole('button', { name: 'Novo lote' }));
    const dialog = screen.getByRole('dialog', { name: 'Novo lote' });
    await user.selectOptions(within(dialog).getByLabelText('Tipo de resíduo'), 'wt-1');
    await user.type(within(dialog).getByLabelText('Quantidade gerada'), '340');
    await user.click(within(dialog).getByRole('button', { name: 'Criar lote' }));

    const list = screen.getByRole('list', { name: 'Lotes aguardando destinação' });
    expect(list).toHaveTextContent('P-0001 · Óleo de refrigeração');
    expect(list).toHaveTextContent('Quantidade 340');
    expect(within(list).getByText('No prazo')).toBeInTheDocument();
    expect(pendingStore.list()).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Lote criado. Ele aguarda a destinação.');
  });

  it('mostra "Prazo vencido" quando o prazo do lote ja expirou', async () => {
    const pendingStore = new InMemoryPendingLotStore();
    pendingStore.add(
      { wasteTypeId: 'wt-1', quantity: 5, deadlineDays: 10 },
      new Date(2026, 9, 1, 12, 0),
    );
    setup({ pendingStore });
    const list = await screen.findByRole('list', { name: 'Lotes aguardando destinação' });
    expect(within(list).getByText('Prazo vencido')).toBeInTheDocument();
  });

  it('registrar a destinacao de um lote pendente preenche o formulario, grava na API e remove o pendente', async () => {
    const pendingStore = new InMemoryPendingLotStore();
    pendingStore.add({ wasteTypeId: 'wt-2', quantity: 90, deadlineDays: 30 }, T0);
    const created = lot('novo', { wasteTypeId: 'wt-2', quantity: 90 });
    const list = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([created]);
    const { register, user } = setup({
      pendingStore,
      list,
      register: vi.fn().mockResolvedValue(created),
    });
    const pendingList = await screen.findByRole('list', { name: 'Lotes aguardando destinação' });

    await user.click(within(pendingList).getByRole('button', { name: 'Registrar destinação' }));
    const dialog = screen.getByRole('dialog', { name: 'Registrar destinação' });
    expect(within(dialog).getByLabelText('Tipo de resíduo')).toHaveValue('wt-2');
    expect(within(dialog).getByLabelText('Quantidade destinada')).toHaveValue(90);

    await user.type(within(dialog).getByLabelText('Local da destinação'), 'Cubatão/SP');
    await user.type(within(dialog).getByLabelText('Empresa receptora'), 'Recicla Metais Brasil');
    await user.type(within(dialog).getByLabelText('Licença da empresa'), 'LO-8812/2024');
    await user.type(within(dialog).getByLabelText(/Comprovante de destinação/), 'mtr-1.pdf');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar destinação' }));

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ wasteTypeId: 'wt-2', quantity: 90, location: 'Cubatão/SP' }),
    );
    expect(await screen.findByText('Nenhum lote aguardando destinação.')).toBeInTheDocument();
    expect(pendingStore.list()).toEqual([]);
  });

  it('se o backend recusar a destinacao, o lote continua pendente', async () => {
    const pendingStore = new InMemoryPendingLotStore();
    pendingStore.add({ wasteTypeId: 'wt-1', quantity: 5, deadlineDays: 30 }, T0);
    const { user } = setup({
      pendingStore,
      register: vi
        .fn()
        .mockRejectedValue(new ApiError('O comprovante de destinação é obrigatório', 400)),
    });
    const pendingList = await screen.findByRole('list', { name: 'Lotes aguardando destinação' });
    await user.click(within(pendingList).getByRole('button', { name: 'Registrar destinação' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Local da destinação'), 'X');
    await user.type(within(dialog).getByLabelText('Empresa receptora'), 'Y');
    await user.type(within(dialog).getByLabelText('Licença da empresa'), 'Z');
    await user.type(within(dialog).getByLabelText(/Comprovante de destinação/), 'a');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar destinação' }));

    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
    expect(pendingStore.list()).toHaveLength(1);
  });
});
