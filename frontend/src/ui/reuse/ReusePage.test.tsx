import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UnitConsumptionStatus, WaterReadingView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { AppRole } from '../../core/auth/roles';
import { InMemoryAppliedStore } from '../../core/reuse/opportunities';
import { FlashProvider } from '../components/Flash';
import { UserProvider } from '../UserContext';
import { ReusePage } from './ReusePage';

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

/** `days` dias de historico, uma leitura por dia, `perDay` litros. */
const history = (unitId: string, days: number, perDay: number): WaterReadingView[] =>
  Array.from({ length: days }, (_, i) => ({
    sensorId: 'sn',
    unitId,
    timestamp: new Date(NOW.getTime() - (days - i) * DAY).toISOString(),
    valueInLiters: perDay,
    readingType: 'sensor' as const,
  }));

function setup({
  roles = ['gestor-ambiental'] as AppRole[],
  units = ['dc-sp1'],
  readings = { 'dc-sp1': history('dc-sp1', 10, 10000) } as Record<string, WaterReadingView[]>,
  list = vi.fn().mockResolvedValue(units.map(status)),
  appliedStore = new InMemoryAppliedStore(),
} = {}) {
  render(
    <FlashProvider>
      <UserProvider user={{ name: 'Marina Costa', email: null, roles }}>
        <ReusePage
          statusApi={{ list }}
          readingApi={{ listByUnit: vi.fn(async (unit: string) => readings[unit] ?? []) }}
          appliedStore={appliedStore}
          now={() => NOW}
        />
      </UserProvider>
    </FlashProvider>,
  );
  return { appliedStore, user: userEvent.setup() };
}

describe('ReusePage (R02 / HU05)', () => {
  it('anota que as estimativas sao de demonstracao e que o backend nao existe', async () => {
    setup();
    expect(await screen.findByText(/Estimativas de demonstração/)).toBeInTheDocument();
    expect(screen.getByText(/adapter em memória/)).toBeInTheDocument();
  });

  // Cenario: Sugerir oportunidade com base no historico
  it('apresenta recomendacoes com a estimativa de economia para a unidade com historico', async () => {
    setup();

    const card = await screen.findByRole('article', {
      name: 'Aumentar os ciclos de concentração das torres — dc-sp1',
    });
    expect(card).toHaveTextContent('Redução · dc-sp1');
    expect(card).toHaveTextContent('~24.000 L/mês');
    expect(card).toHaveTextContent('Esforço baixo');
    expect(card).toHaveTextContent('Consumo medido em 10 dia(s)');
    expect(
      screen.getByRole('article', { name: 'Reaproveitar a água de purga das torres — dc-sp1' }),
    ).toHaveTextContent('~18.000 L/mês');
  });

  it('mostra o potencial de economia somado', async () => {
    setup();
    const summary = await screen.findByRole('region', { name: 'Resumo' });
    expect(summary).toHaveTextContent('Potencial de economia');
    expect(summary).toHaveTextContent('57.000 L/mês');
    expect(summary).toHaveTextContent('3 oportunidade(s) em aberto');
  });

  // Revisao do #58: o resumo e o numero de destaque e nao pode parecer economia medida.
  it('o resumo se declara estimado (demonstracao) e avisa que a soma pode superestimar', async () => {
    setup();
    const summary = await screen.findByRole('region', { name: 'Resumo' });
    expect(summary).toHaveTextContent('estimado — demonstração');
    expect(summary).toHaveTextContent('não são independentes');
    expect(summary).toHaveTextContent('Nada aqui é economia medida');
  });

  it('unidade com historico mas sensor parado aparece em "Sem leituras recentes"', async () => {
    setup({
      units: ['dc-parado'],
      readings: {
        'dc-parado': [
          {
            sensorId: 'sn',
            unitId: 'dc-parado',
            timestamp: new Date(NOW.getTime() - 20 * DAY).toISOString(),
            valueInLiters: 5,
            readingType: 'sensor',
          },
          {
            sensorId: 'sn',
            unitId: 'dc-parado',
            timestamp: new Date(NOW.getTime() - 15 * DAY).toISOString(),
            valueInLiters: 5,
            readingType: 'sensor',
          },
        ],
      },
    });
    const list = await screen.findByRole('list', { name: 'Unidades sem leituras recentes' });
    expect(list).toHaveTextContent('dc-parado');
    expect(list).toHaveTextContent('mais de 24 horas');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  // Cenario: Indicar ausencia de dados suficientes
  it('informa que nao ha historico suficiente para unidade com menos de um dia', async () => {
    setup({
      units: ['dc-rs5'],
      readings: {
        'dc-rs5': [
          {
            sensorId: 'sn',
            unitId: 'dc-rs5',
            timestamp: new Date(NOW.getTime() - 3_600_000).toISOString(),
            valueInLiters: 5,
            readingType: 'sensor',
          },
          {
            sensorId: 'sn',
            unitId: 'dc-rs5',
            timestamp: new Date(NOW.getTime() - 600_000).toISOString(),
            valueInLiters: 6,
            readingType: 'sensor',
          },
        ],
      },
    });

    const list = await screen.findByRole('list', { name: 'Unidades sem histórico suficiente' });
    expect(list).toHaveTextContent('dc-rs5');
    expect(list).toHaveTextContent('Não há histórico suficiente para gerar recomendações');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('com varias unidades, recomenda para as com historico e lista as demais', async () => {
    setup({
      units: ['dc-rs5', 'dc-sp1'],
      readings: { 'dc-sp1': history('dc-sp1', 10, 10000), 'dc-rs5': [] },
    });
    await screen.findAllByRole('article');
    expect(
      screen.getAllByRole('article').every((a) => a.getAttribute('aria-label')?.endsWith('dc-sp1')),
    ).toBe(true);
    expect(
      screen.getByRole('list', { name: 'Unidades sem histórico suficiente' }),
    ).toHaveTextContent('dc-rs5');
  });

  it('Aplicar move a oportunidade para "Ja aplicadas", abate o potencial e avisa', async () => {
    const { appliedStore, user } = setup();
    const card = await screen.findByRole('article', {
      name: 'Aumentar os ciclos de concentração das torres — dc-sp1',
    });
    await user.click(within(card).getByRole('button', { name: 'Aplicar' }));

    expect(appliedStore.has('cycles-dc-sp1')).toBe(true);
    const applied = screen.getByRole('heading', { name: 'Já aplicadas' }).closest('section')!;
    expect(within(applied).getByRole('article')).toHaveTextContent('Aplicada');
    expect(within(applied).queryByRole('button', { name: 'Aplicar' })).not.toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Resumo' });
    expect(summary).toHaveTextContent('33.000 L/mês'); // 57.000 - 24.000
    expect(summary).toHaveTextContent('2 oportunidade(s) em aberto');
    expect(summary).toHaveTextContent('24.000 L/mês marcados como aplicados (estimativa)');
    expect(screen.getByRole('status')).toHaveTextContent('Oportunidade marcada como aplicada.');
  });

  it('o que ja foi aplicado continua aplicado ao voltar para a tela (mesmo adapter)', async () => {
    const appliedStore = new InMemoryAppliedStore();
    appliedStore.apply('purge-dc-sp1');
    setup({ appliedStore });
    const applied = (await screen.findByRole('heading', { name: 'Já aplicadas' })).closest(
      'section',
    )!;
    expect(within(applied).getByRole('article')).toHaveTextContent('Reaproveitar a água de purga');
  });

  it('perfil sem permissao de aplicar nao ve o botao Aplicar', async () => {
    setup({ roles: ['operador'] });
    await screen.findAllByRole('article');
    expect(screen.queryByRole('button', { name: 'Aplicar' })).not.toBeInTheDocument();
  });

  it('sem unidades mostra estado vazio', async () => {
    setup({ units: [] });
    expect(
      await screen.findByText('Nenhuma unidade com sensor ou leitura registrada ainda.'),
    ).toBeInTheDocument();
  });

  it('mostra o erro do backend ao falhar', async () => {
    setup({ list: vi.fn().mockRejectedValue(new ApiError('Erro 403', 403)) });
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro 403');
  });

  it('usa mensagem generica para falha de rede', async () => {
    setup({ list: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao carregar o histórico de consumo',
    );
  });

  // Revisao do #58: a carga rodava so na montagem; falhou, so recarregando a pagina.
  it('apos uma falha, "Tentar de novo" refaz a busca e limpa o erro', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue([status('dc-sp1')]);
    const { user } = setup({ list });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao carregar o histórico de consumo',
    );

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findAllByRole('article')).not.toHaveLength(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
