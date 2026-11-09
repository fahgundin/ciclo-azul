import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UnitConsumptionStatus, WasteLotView, WaterReadingView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { AppRole } from '../../core/auth/roles';
import { InMemoryLimitStore } from '../../core/limits/limits';
import { InMemoryAppliedStore } from '../../core/reuse/opportunities';
import { InMemoryPendingLotStore } from '../../core/waste/pending-lot';
import { UserProvider } from '../UserContext';
import { DashboardPage } from './DashboardPage';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const DAY = 86_400_000;

const status = (unitId: string): UnitConsumptionStatus => ({
  unitId,
  state: 'live',
  currentValueInLiters: 1,
  lastReadingAt: NOW.toISOString(),
  lastReadingType: 'sensor',
  staleAfterMinutes: 15,
});

const reading = (unitId: string, msAgo: number, value: number): WaterReadingView => ({
  sensorId: 'sn',
  unitId,
  timestamp: new Date(NOW.getTime() - msAgo).toISOString(),
  valueInLiters: value,
  readingType: 'sensor',
});

/** 10 dias a 1.000 L/dia (uma leitura por dia, a de hoje 1 h atras): hoje = 1.000 L. */
const tenDays = (unitId: string): WaterReadingView[] =>
  Array.from({ length: 10 }, (_, i) =>
    reading(unitId, i === 9 ? 3_600_000 : (9 - i) * DAY + 3_600_000, 1000),
  );

const lot = (id: string): WasteLotView => ({
  id,
  wasteTypeId: 't1',
  location: 'Galpão',
  receiverCompany: 'Recicla',
  license: 'L-1',
  date: NOW.toISOString(),
  quantity: 10,
  proofReference: 'MTR-1',
  status: 'destined',
});

function setup({
  roles = ['diretoria'] as AppRole[],
  list = vi.fn().mockResolvedValue([status('dc-sp1')]),
  listByUnit = vi.fn(async (unit: string) => tenDays(unit)),
  lots = vi.fn().mockResolvedValue([lot('l1'), lot('l2'), lot('l3')]),
  limitStore = new InMemoryLimitStore(),
  pendingLotStore = new InMemoryPendingLotStore(),
  appliedStore = new InMemoryAppliedStore(),
} = {}) {
  render(
    <UserProvider user={{ name: 'Carlos Souza', email: null, roles }}>
      <DashboardPage
        statusApi={{ list }}
        readingApi={{ listByUnit }}
        lotApi={{ list: lots }}
        limitStore={limitStore}
        pendingLotStore={pendingLotStore}
        appliedStore={appliedStore}
        now={() => NOW}
      />
    </UserProvider>,
  );
  return { user: userEvent.setup(), lots, limitStore, pendingLotStore, appliedStore };
}

describe('DashboardPage (R10 / HU09)', () => {
  it('anota que os KPIs sao calculados no navegador e que reuso e economia sao estimativas', async () => {
    setup();
    expect(await screen.findByText(/calculados neste navegador/)).toBeInTheDocument();
    expect(screen.getByText(/estimativas de demonstração/)).toBeInTheDocument();
  });

  it('mostra o consumo de hoje (soma das leituras do dia)', async () => {
    setup();
    const card = await screen.findByRole('article', { name: 'Consumo de água hoje' });
    expect(card).toHaveTextContent('1.000 L');
  });

  describe('consumo frente ao limite geral', () => {
    const withLimit = (limit: number) => {
      const limitStore = new InMemoryLimitStore();
      limitStore.save({ general: limit, units: {} });
      return limitStore;
    };

    it('dentro do limite', async () => {
      setup({ limitStore: withLimit(5000) });
      const card = await screen.findByRole('article', { name: 'Consumo de água hoje' });
      expect(card).toHaveTextContent('de 5.000 L (limite geral)');
      expect(card).toHaveTextContent('20% do limite');
      expect(card).toHaveTextContent('Dentro do limite');
      expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
    });

    it('perto do limite (a partir de 80%)', async () => {
      setup({ limitStore: withLimit(1200) });
      const card = await screen.findByRole('article', { name: 'Consumo de água hoje' });
      expect(card).toHaveTextContent('83% do limite');
      expect(card).toHaveTextContent('Perto do limite');
    });

    it('excedido, com a barra limitada a 100%', async () => {
      setup({ limitStore: withLimit(500) });
      const card = await screen.findByRole('article', { name: 'Consumo de água hoje' });
      expect(card).toHaveTextContent('200% do limite');
      expect(card).toHaveTextContent('Limite excedido');
      expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('sem limite definido, avisa e nao mostra barra', async () => {
      setup();
      const card = await screen.findByRole('article', { name: 'Consumo de água hoje' });
      expect(card).toHaveTextContent('Sem limite geral definido');
      expect(within(card).queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('reuso e economia (estimativas)', () => {
    it('sem oportunidades aplicadas: 0% e 0 L/mês', async () => {
      setup();
      expect(await screen.findByRole('article', { name: 'Reuso de água' })).toHaveTextContent('0%');
      expect(screen.getByRole('article', { name: 'Água economizada' })).toHaveTextContent(
        '0 L/mês',
      );
    });

    it('reflete as oportunidades marcadas como aplicadas', async () => {
      const appliedStore = new InMemoryAppliedStore();
      // 10.000 L em ~9,04 dias => ~33.180 L/mes: purga (6%) ~1.991 L + ciclos (8%) ~2.654 L.
      appliedStore.apply('purge-dc-sp1');
      appliedStore.apply('cycles-dc-sp1');
      setup({ appliedStore });
      expect(await screen.findByRole('article', { name: 'Reuso de água' })).toHaveTextContent('6%');
      const saved = screen.getByRole('article', { name: 'Água economizada' });
      expect(saved).toHaveTextContent('4.645 L/mês');
      expect(saved).toHaveTextContent('2 oportunidade(s)');
      expect(saved).toHaveTextContent('Nada aqui é economia medida');
    });

    it('sem histórico suficiente, o percentual de reuso não existe', async () => {
      setup({ listByUnit: vi.fn(async () => []) });
      expect(await screen.findByRole('article', { name: 'Reuso de água' })).toHaveTextContent('—');
    });
  });

  describe('resíduos destinados', () => {
    it('Gestor: percentual entre destinados e pendentes, com vencidos à parte', async () => {
      const pendingLotStore = new InMemoryPendingLotStore();
      pendingLotStore.add(
        { wasteTypeId: 't1', quantity: 5, deadlineDays: 30 },
        new Date(NOW.getTime() - 40 * DAY),
      );
      setup({ roles: ['gestor-ambiental'], pendingLotStore });
      const card = await screen.findByRole('article', {
        name: 'Resíduos destinados corretamente',
      });
      await screen.findByText(/lote\(s\) destinado\(s\)/);
      expect(card).toHaveTextContent('75%');
      expect(card).toHaveTextContent('3 lote(s) destinado(s), 1 em aberto, 1 com prazo vencido');
    });

    it('Diretoria: não enxerga lotes pendentes, então não há percentual', async () => {
      setup({ roles: ['diretoria'] });
      const card = await screen.findByRole('article', {
        name: 'Resíduos destinados corretamente',
      });
      await screen.findByText(/lote\(s\) destinado\(s\)/);
      expect(card).toHaveTextContent('—');
      expect(card).toHaveTextContent('3 lote(s) destinado(s)');
      expect(card).toHaveTextContent('o percentual não é calculado'.replace('o', 'O'));
    });

    it.each<AppRole>(['operador', 'administrador'])(
      '%s não vê o indicador (o backend recusa a consulta de lotes)',
      async (role) => {
        const { lots } = setup({ roles: [role] });
        await screen.findByRole('article', { name: 'Consumo de água hoje' });
        expect(
          screen.queryByRole('article', { name: 'Resíduos destinados corretamente' }),
        ).not.toBeInTheDocument();
        expect(lots).not.toHaveBeenCalled();
      },
    );
  });

  it('desenha o consumo dos últimos 7 dias, marcando hoje como parcial', async () => {
    setup();
    const chart = await screen.findByRole('list', {
      name: 'Consumo diário de água nos últimos 7 dias, em litros',
    });
    const items = within(chart).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    expect(items[6]).toHaveAttribute('title', expect.stringContaining('(hoje, parcial)'));
    expect(items[6]).toHaveTextContent('1.000');
  });

  it('dia acima do limite geral é identificado também em texto', async () => {
    const limitStore = new InMemoryLimitStore();
    limitStore.save({ general: 500, units: {} });
    setup({ limitStore });
    const chart = await screen.findByRole('list', {
      name: 'Consumo diário de água nos últimos 7 dias, em litros',
    });
    expect(within(chart).getAllByText('acima').length).toBeGreaterThan(0);
  });

  it('erro ao carregar o consumo: mostra a mensagem e permite tentar de novo', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('Erro interno', 500))
      .mockResolvedValue([status('dc-sp1')]);
    const { user } = setup({ list });
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno');

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(
      await screen.findByRole('article', { name: 'Consumo de água hoje' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('falha só nos lotes não derruba os demais indicadores', async () => {
    setup({
      roles: ['gestor-ambiental'],
      lots: vi.fn().mockRejectedValue(new ApiError('Acesso negado', 403)),
    });
    expect(
      await screen.findByRole('article', { name: 'Consumo de água hoje' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso negado');
  });
});
