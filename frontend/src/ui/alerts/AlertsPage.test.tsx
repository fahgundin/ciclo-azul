import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UnitConsumptionStatus, WaterReadingView } from '@ciclo-azul/contracts';
import type { AppRole } from '../../core/auth/roles';
import { InMemoryLimitStore } from '../../core/limits/limits';
import { InMemoryPendingLotStore } from '../../core/waste/pending-lot';
import { FlashProvider } from '../components/Flash';
import { UserProvider } from '../UserContext';
import { fakeRealtime } from '../../test-helpers/fake-realtime';
import { AlertsPage } from './AlertsPage';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const status = (
  unitId: string,
  state: UnitConsumptionStatus['state'] = 'live',
  ago = 1,
): UnitConsumptionStatus => ({
  unitId,
  state,
  currentValueInLiters: 1,
  lastReadingAt: minutesAgo(ago),
  lastReadingType: 'sensor',
  staleAfterMinutes: 15,
});

const reading = (unitId: string, ago: number, valueInLiters: number): WaterReadingView => ({
  sensorId: 'sn',
  unitId,
  timestamp: minutesAgo(ago),
  valueInLiters,
  readingType: 'sensor',
});

function setup({
  roles = ['gestor-ambiental'] as AppRole[],
  statuses = [status('dc-sp1')],
  history = {} as Record<string, WaterReadingView[]>,
  limitStore = new InMemoryLimitStore(),
  pendingLotStore = new InMemoryPendingLotStore(),
  wasteList = vi
    .fn()
    .mockResolvedValue([{ id: 'wt-1', name: 'Óleo', classification: 'Metal pesado' }]),
} = {}) {
  const rt = fakeRealtime();
  const listByUnit = vi.fn(async (unit: string) => [...(history[unit] ?? [])]);
  render(
    <FlashProvider>
      <UserProvider user={{ name: 'Marina Costa', email: null, roles }}>
        <AlertsPage
          statusApi={{ list: vi.fn().mockResolvedValue(statuses) }}
          readingApi={{ listByUnit }}
          wasteApi={{ list: wasteList }}
          createRealtime={() => rt.realtime}
          getToken={() => 'tok'}
          limitStore={limitStore}
          pendingLotStore={pendingLotStore}
          now={() => NOW}
        />
      </UserProvider>
    </FlashProvider>,
  );
  return { rt, listByUnit, limitStore, pendingLotStore, wasteList, user: userEvent.setup() };
}

const openAlerts = async () => screen.findByRole('list', { name: 'Alertas em aberto' });

describe('AlertsPage — limites de consumo (R03 / HU04)', () => {
  it('anota que limites e lotes ficam em memoria e que os alertas sao calculados no navegador', async () => {
    setup();
    expect(await screen.findByText(/adapter em memória/)).toBeInTheDocument();
    expect(screen.getByText(/não há notificação por push ou e-mail/)).toBeInTheDocument();
  });

  it('sem limites nem lotes: nenhum alerta e nenhum limite definido', async () => {
    setup();
    expect(await screen.findByText('Nenhum alerta em aberto.')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum limite definido/)).toBeInTheDocument();
  });

  // Cenario: Cadastrar limite de consumo por unidade
  it('o Gestor define 10.000 litros/dia para a unidade e o limite passa a ser monitorado', async () => {
    const { limitStore, user } = setup({
      history: { 'dc-sp1': [reading('dc-sp1', 30, 2500)] },
    });
    await screen.findByText('Nenhum alerta em aberto.');

    await user.click(screen.getByRole('button', { name: 'Definir limites de consumo' }));
    const dialog = screen.getByRole('dialog', { name: 'Definir limites de consumo' });
    await user.type(within(dialog).getByLabelText('dc-sp1, litros/dia'), '10000');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar limites' }));

    expect(limitStore.get()).toEqual({ general: null, units: { 'dc-sp1': 10000 } });
    const limits = screen.getByRole('list', { name: 'Limites diários' });
    expect(limits).toHaveTextContent('dc-sp1');
    expect(limits).toHaveTextContent('25% · Dentro do limite');
    expect(limits).toHaveTextContent('2.500 L de 10.000 L');
    expect(screen.getByRole('progressbar', { name: 'Consumo de dc-sp1' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Limites atualizados.');
  });

  // Cenario: Gerar alerta ao ultrapassar o limite (10.000 L/dia, consumo de 10.500 L)
  it('gera alerta critico quando o consumo do dia passa do limite', async () => {
    const limitStore = new InMemoryLimitStore();
    limitStore.save({ general: null, units: { 'dc-sp1': 10000 } });
    setup({
      limitStore,
      history: { 'dc-sp1': [reading('dc-sp1', 60, 6000), reading('dc-sp1', 30, 4500)] },
    });

    const list = await openAlerts();
    const alert = within(list).getByText('Limite excedido: dc-sp1').closest('li')!;
    expect(alert).toHaveTextContent('Crítico');
    expect(alert).toHaveTextContent('Consumo');
    expect(alert).toHaveTextContent('Consumo de hoje em 10.500 L, acima do limite de 10.000 L.');
  });

  // Bug da revisao do #57: o hook guarda so 60 leituras ao vivo; as mais antigas saiam da soma do dia.
  it('o consumo do dia conta TODAS as leituras ao vivo, mesmo passando de 60 na sessao', async () => {
    const limitStore = new InMemoryLimitStore();
    limitStore.save({ general: null, units: { 'dc-sp1': 10000 } });
    const { rt } = setup({ limitStore, history: { 'dc-sp1': [reading('dc-sp1', 60, 9500)] } });
    await screen.findByText('Nenhum alerta em aberto.');

    const live = (second: number, valueInLiters: number) => ({
      unitId: 'dc-sp1',
      sensorId: 'sn',
      timestamp: new Date(NOW.getTime() - 30 * 60_000 + second * 1000).toISOString(),
      valueInLiters,
      readingType: 'sensor' as const,
    });
    // A primeira leitura ao vivo (600 L) e a que o teto de 60 descartaria; 64 de 1 L vem depois.
    await rt.emit(live(0, 600));
    for (let i = 1; i <= 64; i += 1) {
      await rt.emit(live(i, 1));
    }

    // 9.500 + 600 + 64 = 10.164 L > 10.000 L (com o teto de 60 sairia 9.560 L e nao alertaria)
    const alert = (await screen.findByText('Limite excedido: dc-sp1')).closest('li')!;
    expect(alert).toHaveTextContent('Consumo de hoje em 10.164 L, acima do limite de 10.000 L.');
  });

  it('ao reconectar, rebusca o historico para recuperar leituras enviadas com a conexao caida', async () => {
    const limitStore = new InMemoryLimitStore();
    limitStore.save({ general: null, units: { 'dc-sp1': 10000 } });
    const stored: WaterReadingView[] = [reading('dc-sp1', 60, 2000)];
    const { rt, listByUnit } = setup({
      limitStore,
      history: { 'dc-sp1': stored },
    });
    await screen.findByText('Nenhum alerta em aberto.');
    const before = listByUnit.mock.calls.length;

    stored.push(reading('dc-sp1', 5, 9000)); // chegou enquanto a conexao estava fora
    await rt.reconnect();

    expect(await screen.findByText('Limite excedido: dc-sp1')).toBeInTheDocument();
    expect(listByUnit.mock.calls.length).toBeGreaterThan(before);
  });

  it('uma leitura nova recebida em tempo real pode fazer o limite estourar', async () => {
    const limitStore = new InMemoryLimitStore();
    limitStore.save({ general: null, units: { 'dc-sp1': 10000 } });
    const { rt } = setup({ limitStore, history: { 'dc-sp1': [reading('dc-sp1', 60, 9800)] } });
    await screen.findByText('Nenhum alerta em aberto.');
    expect(screen.queryByText('Limite excedido: dc-sp1')).not.toBeInTheDocument();

    await rt.emit({
      unitId: 'dc-sp1',
      sensorId: 'sn',
      timestamp: minutesAgo(0),
      valueInLiters: 700,
      readingType: 'sensor',
    });

    expect(await screen.findByText('Limite excedido: dc-sp1')).toBeInTheDocument();
  });

  it('so conta o consumo do dia atual (UTC)', async () => {
    const limitStore = new InMemoryLimitStore();
    limitStore.save({ general: null, units: { 'dc-sp1': 1000 } });
    const yesterday: WaterReadingView = {
      ...reading('dc-sp1', 0, 99999),
      timestamp: '2026-11-06T23:00:00.000Z',
    };
    setup({ limitStore, history: { 'dc-sp1': [yesterday] } });
    expect(await screen.findByText('Nenhum alerta em aberto.')).toBeInTheDocument();
  });

  it('o limite geral soma todas as unidades', async () => {
    const limitStore = new InMemoryLimitStore();
    limitStore.save({ general: 1000, units: {} });
    setup({
      limitStore,
      statuses: [status('dc-cps'), status('dc-sp1')],
      history: { 'dc-cps': [reading('dc-cps', 10, 600)], 'dc-sp1': [reading('dc-sp1', 10, 500)] },
    });
    expect(await screen.findByText('Limite excedido: consumo geral')).toBeInTheDocument();
  });
});

describe('AlertsPage — lote sem destinacao (R08 / HU08)', () => {
  // Cenario: Gerar alerta de lote vencido sem destinacao
  it('gera alerta para lote gerado ha mais tempo que o prazo, sem destinacao', async () => {
    const pendingLotStore = new InMemoryPendingLotStore();
    pendingLotStore.add(
      { wasteTypeId: 'wt-1', quantity: 120, deadlineDays: 30 },
      new Date('2026-09-01T12:00:00.000Z'),
    );
    setup({ pendingLotStore });

    const list = await openAlerts();
    const alert = within(list).getByText('Lote P-0001 sem destinação').closest('li')!;
    expect(alert).toHaveTextContent('Crítico');
    expect(alert).toHaveTextContent('Resíduos');
    expect(alert).toHaveTextContent('Óleo (120): prazo venceu há 37 dia(s).');
  });

  // Cenario: Nao alertar lote dentro do prazo
  it('lote dentro do prazo nao gera alerta', async () => {
    const pendingLotStore = new InMemoryPendingLotStore();
    pendingLotStore.add(
      { wasteTypeId: 'wt-1', quantity: 120, deadlineDays: 30 },
      new Date('2026-11-01T12:00:00.000Z'),
    );
    setup({ pendingLotStore });
    expect(await screen.findByText('Nenhum alerta em aberto.')).toBeInTheDocument();
  });
});

describe('AlertsPage — unidade sem dados recentes e perfis', () => {
  it('alerta a unidade que tinha leitura e parou ha mais de 15 minutos', async () => {
    setup({ statuses: [status('dc-rj2', 'stale', 40)] });
    expect(await screen.findByText('Sem dados recentes: dc-rj2')).toBeInTheDocument();
  });

  it('Operador ve alertas de consumo e sensores, mas nao define limites nem ve lotes', async () => {
    const pendingLotStore = new InMemoryPendingLotStore();
    pendingLotStore.add(
      { wasteTypeId: 'wt-1', quantity: 1, deadlineDays: 1 },
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const limitStore = new InMemoryLimitStore();
    limitStore.save({ general: null, units: { 'dc-sp1': 100 } });
    const { wasteList } = setup({
      roles: ['operador'],
      pendingLotStore,
      limitStore,
      statuses: [status('dc-sp1'), status('dc-rj2', 'stale', 40)],
      history: { 'dc-sp1': [reading('dc-sp1', 10, 500)] },
    });

    const list = await openAlerts();
    expect(within(list).getByText('Limite excedido: dc-sp1')).toBeInTheDocument();
    expect(within(list).getByText('Sem dados recentes: dc-rj2')).toBeInTheDocument();
    expect(within(list).queryByText(/sem destinação/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Definir limites de consumo' }),
    ).not.toBeInTheDocument();
    expect(wasteList).not.toHaveBeenCalled();
  });
});
