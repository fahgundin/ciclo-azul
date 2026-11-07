import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReadingEvent, UnitConsumptionStatus, WaterReadingView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import { WaterPage } from './WaterPage';
import type { RealtimeLike } from './useWaterStatus';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const status = (
  unitId: string,
  lastReadingAt: string | null,
  value: number | null,
  state: UnitConsumptionStatus['state'],
  lastReadingType: UnitConsumptionStatus['lastReadingType'] = lastReadingAt ? 'sensor' : null,
): UnitConsumptionStatus => ({
  unitId,
  state,
  currentValueInLiters: value,
  lastReadingAt,
  lastReadingType,
  staleAfterMinutes: 15,
});

/** Cliente de tempo real falso: guarda os handlers e deixa o teste "enviar" leituras. */
function fakeRealtime() {
  const handlers = new Set<(event: ReadingEvent) => void>();
  const realtime = {
    connect: vi.fn(),
    subscribeUnit: vi.fn(),
    disconnect: vi.fn(),
    onReading: vi.fn((handler: (event: ReadingEvent) => void) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    }),
  };
  return {
    realtime: realtime as unknown as RealtimeLike,
    mock: realtime,
    emit: (event: ReadingEvent) => act(() => handlers.forEach((h) => h(event))),
  };
}

const reading = (unitId: string, timestamp: string, valueInLiters: number): WaterReadingView => ({
  sensorId: 'sn-1',
  unitId,
  timestamp,
  valueInLiters,
  readingType: 'sensor',
});

function setup({
  statuses = [] as UnitConsumptionStatus[],
  list = vi.fn().mockResolvedValue(statuses),
  history = vi.fn().mockResolvedValue([] as WaterReadingView[]),
  token = 'tok' as string | null,
  tickMs = 30_000,
} = {}) {
  const rt = fakeRealtime();
  const view = render(
    <WaterPage
      statusApi={{ list }}
      readingApi={{ listByUnit: history }}
      createRealtime={() => rt.realtime}
      getToken={() => token}
      now={() => new Date()}
      tickMs={tickMs}
    />,
  );
  return { list, history, rt, view };
}

const card = (unitId: string) => screen.getByRole('listitem', { name: `Unidade ${unitId}` });

describe('WaterPage (R05 / HU03)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  // Cenario: Exibir consumo atualizado de uma unidade
  it('exibe o consumo atual de cada unidade, com a origem e o instante da ultima leitura', async () => {
    setup({
      statuses: [
        status('dc-cps', minutesAgo(1), 1234.5, 'live', 'sensor'),
        status('dc-sp1', minutesAgo(2), 80, 'live', 'manual'),
      ],
    });

    const sp1 = await screen.findByRole('listitem', { name: 'Unidade dc-sp1' });
    expect(within(card('dc-cps')).getByText('1.234,5 L')).toBeInTheDocument();
    expect(card('dc-cps')).toHaveTextContent('· sensor');
    expect(sp1).toHaveTextContent('80 L');
    expect(sp1).toHaveTextContent('· leitura manual');
    expect(within(sp1).getByText('Dados recentes')).toBeInTheDocument();
  });

  it('atualiza o valor da unidade quando chega uma leitura nova pelo WebSocket', async () => {
    const { rt } = setup({ statuses: [status('dc-sp1', minutesAgo(3), 50, 'live')] });
    await screen.findByRole('listitem', { name: 'Unidade dc-sp1' });
    expect(card('dc-sp1')).toHaveTextContent('50 L');

    await rt.emit({
      unitId: 'dc-sp1',
      sensorId: 'sn-1',
      timestamp: minutesAgo(0),
      valueInLiters: 77.5,
      readingType: 'sensor',
    });

    expect(card('dc-sp1')).toHaveTextContent('77,5 L');
    expect(card('dc-sp1')).not.toHaveTextContent('50 L');
  });

  it('conecta com o token e assina cada unidade', async () => {
    const { rt } = setup({
      statuses: [
        status('dc-cps', minutesAgo(1), 1, 'live'),
        status('dc-sp1', minutesAgo(1), 1, 'live'),
      ],
    });
    await screen.findByRole('listitem', { name: 'Unidade dc-sp1' });

    expect(rt.mock.connect).toHaveBeenCalledWith('tok');
    expect(rt.mock.subscribeUnit).toHaveBeenCalledWith('dc-cps');
    expect(rt.mock.subscribeUnit).toHaveBeenCalledWith('dc-sp1');
    expect(rt.mock.subscribeUnit).toHaveBeenCalledTimes(2);
  });

  it('sem token nao abre conexao em tempo real', async () => {
    const { rt } = setup({ statuses: [status('dc-sp1', minutesAgo(1), 1, 'live')], token: null });
    await screen.findByRole('listitem', { name: 'Unidade dc-sp1' });
    expect(rt.mock.connect).not.toHaveBeenCalled();
  });

  it('encerra a conexao ao sair da tela', async () => {
    const { rt, view } = setup({ statuses: [status('dc-sp1', minutesAgo(1), 1, 'live')] });
    await screen.findByRole('listitem', { name: 'Unidade dc-sp1' });
    view.unmount();
    expect(rt.mock.disconnect).toHaveBeenCalledTimes(1);
  });

  // Cenario: Indicar unidade sem leitura recente
  it('sinaliza "Sem dados recentes" para unidade parada ha mais de 15 minutos', async () => {
    setup({ statuses: [status('dc-rj2', minutesAgo(16), 9, 'stale')] });
    const rj2 = await screen.findByRole('listitem', { name: 'Unidade dc-rj2' });
    expect(within(rj2).getByText('Sem dados recentes')).toBeInTheDocument();
    expect(within(rj2).queryByText('Dados recentes')).not.toBeInTheDocument();
  });

  it('a unidade vira "Sem dados recentes" sozinha, com o passar do tempo e sem leitura nova', async () => {
    setup({ statuses: [status('dc-sp1', minutesAgo(10), 5, 'live')], tickMs: 30_000 });
    await screen.findByRole('listitem', { name: 'Unidade dc-sp1' });
    expect(within(card('dc-sp1')).getByText('Dados recentes')).toBeInTheDocument();

    // 10 min + 6 min = 16 min sem leitura (> 15)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6 * 60_000);
    });

    expect(within(card('dc-sp1')).getByText('Sem dados recentes')).toBeInTheDocument();
  });

  it('uma leitura nova tira a unidade de "Sem dados recentes"', async () => {
    const { rt } = setup({ statuses: [status('dc-rj2', minutesAgo(40), 9, 'stale')] });
    await screen.findByRole('listitem', { name: 'Unidade dc-rj2' });
    expect(within(card('dc-rj2')).getByText('Sem dados recentes')).toBeInTheDocument();

    await rt.emit({
      unitId: 'dc-rj2',
      sensorId: 'sn-1',
      timestamp: minutesAgo(0),
      valueInLiters: 12,
      readingType: 'sensor',
    });

    expect(within(card('dc-rj2')).getByText('Dados recentes')).toBeInTheDocument();
  });

  it('unidade que nunca teve leitura aparece como "Sem leituras"', async () => {
    setup({ statuses: [status('dc-new', null, null, 'no-data')] });
    const unit = await screen.findByRole('listitem', { name: 'Unidade dc-new' });
    expect(unit).toHaveTextContent('Nenhuma leitura recebida');
    expect(within(unit).getByText('Sem leituras')).toBeInTheDocument();
    expect(within(unit).getByText('—')).toBeInTheDocument();
  });

  it('mostra estado vazio sem unidades', async () => {
    setup();
    expect(
      await screen.findByText('Nenhuma unidade com sensor ou leitura registrada ainda.'),
    ).toBeInTheDocument();
  });

  it('mostra o erro do backend ao falhar', async () => {
    setup({ list: vi.fn().mockRejectedValue(new ApiError('Erro 403', 403)) });
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro 403');
  });

  it('Atualizar busca de novo e passa a assinar a unidade nova', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce([status('dc-sp1', minutesAgo(1), 1, 'live')])
      .mockResolvedValue([
        status('dc-sp1', minutesAgo(1), 1, 'live'),
        status('dc-sp2', minutesAgo(1), 2, 'live'),
      ]);
    const { rt } = setup({ list });
    await screen.findByRole('listitem', { name: 'Unidade dc-sp1' });

    await act(async () => {
      screen.getByRole('button', { name: 'Atualizar' }).click();
    });

    expect(await screen.findByRole('listitem', { name: 'Unidade dc-sp2' })).toBeInTheDocument();
    expect(rt.mock.subscribeUnit).toHaveBeenCalledWith('dc-sp2');
    expect(rt.mock.subscribeUnit).toHaveBeenCalledTimes(2); // sp1 uma vez so
  });
});

describe('WaterPage — grafico', () => {
  it('desenha o historico da unidade e acrescenta as leituras ao vivo', async () => {
    const history = vi
      .fn()
      .mockResolvedValue([
        reading('dc-sp1', '2026-11-07T10:00:00.000Z', 10),
        reading('dc-sp1', '2026-11-07T10:30:00.000Z', 20),
      ]);
    const list = vi
      .fn()
      .mockResolvedValue([status('dc-sp1', '2026-11-07T10:30:00.000Z', 20, 'live')]);
    const rt = fakeRealtime();
    const { container } = render(
      <WaterPage
        statusApi={{ list }}
        readingApi={{ listByUnit: history }}
        createRealtime={() => rt.realtime}
        getToken={() => 'tok'}
        now={() => new Date('2026-11-07T10:31:00.000Z')}
      />,
    );

    const chart = await screen.findByRole('img', {
      name: 'Leituras de consumo de dc-sp1, em litros',
    });
    expect(history).toHaveBeenCalledWith('dc-sp1');
    const before = container.querySelector('path.chart__line')!.getAttribute('d')!;
    expect(chart).toBeInTheDocument();

    await rt.emit({
      unitId: 'dc-sp1',
      sensorId: 'sn-1',
      timestamp: '2026-11-07T11:00:00.000Z',
      valueInLiters: 35,
      readingType: 'sensor',
    });

    const after = container.querySelector('path.chart__line')!.getAttribute('d')!;
    expect(after).not.toBe(before);
    expect((after.match(/L/g) ?? []).length).toBe((before.match(/L/g) ?? []).length + 1);
  });

  it('trocar a unidade carrega o historico dela', async () => {
    const history = vi.fn().mockResolvedValue([]);
    const list = vi
      .fn()
      .mockResolvedValue([
        status('dc-cps', '2026-11-07T10:00:00.000Z', 1, 'live'),
        status('dc-sp1', '2026-11-07T10:00:00.000Z', 1, 'live'),
      ]);
    const rt = fakeRealtime();
    render(
      <WaterPage
        statusApi={{ list }}
        readingApi={{ listByUnit: history }}
        createRealtime={() => rt.realtime}
        getToken={() => 'tok'}
        now={() => new Date('2026-11-07T10:01:00.000Z')}
      />,
    );
    await screen.findByLabelText('Unidade');
    await waitFor(() => expect(history).toHaveBeenCalledWith('dc-cps'));

    await userEvent.setup().selectOptions(screen.getByLabelText('Unidade'), 'dc-sp1');
    await waitFor(() => expect(history).toHaveBeenCalledWith('dc-sp1'));
  });

  it('avisa quando o historico da unidade nao carrega', async () => {
    const list = vi
      .fn()
      .mockResolvedValue([status('dc-sp1', '2026-11-07T10:00:00.000Z', 1, 'live')]);
    const rt = fakeRealtime();
    render(
      <WaterPage
        statusApi={{ list }}
        readingApi={{ listByUnit: vi.fn().mockRejectedValue(new Error('x')) }}
        createRealtime={() => rt.realtime}
        getToken={() => 'tok'}
        now={() => new Date('2026-11-07T10:01:00.000Z')}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o histórico desta unidade.',
    );
  });
});
