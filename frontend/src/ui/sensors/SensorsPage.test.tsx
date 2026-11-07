import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SensorView, WaterReadingView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { SensorApi } from '../../core/api/sensor-api';
import type { WaterReadingApi } from '../../core/api/water-reading-api';
import { FlashProvider } from '../components/Flash';
import { SensorsPage } from './SensorsPage';

const NOW = new Date(2026, 10, 5, 12, 0);

const sensor = (sensorId: string, unitId: string): SensorView => ({
  sensorId,
  unitId,
  status: 'connected',
  linkedAt: '2026-11-04T13:30:00.000Z',
});

function setup({
  sensors = [] as SensorView[],
  list = vi.fn().mockResolvedValue(sensors),
  link = vi.fn(),
  registerManual = vi.fn().mockResolvedValue({}),
  listByUnit = vi.fn().mockResolvedValue([] as WaterReadingView[]),
} = {}) {
  const sensorApi = { list, link } as unknown as SensorApi;
  const readingApi = { registerManual, listByUnit } as unknown as WaterReadingApi;
  render(
    <FlashProvider>
      <SensorsPage sensorApi={sensorApi} readingApi={readingApi} now={() => NOW} />
    </FlashProvider>,
  );
  return { list, link, registerManual, listByUnit, user: userEvent.setup() };
}

describe('SensorsPage (R04)', () => {
  it('lista os sensores agrupados por unidade (ordem alfabetica) com a etiqueta Conectado', async () => {
    setup({
      sensors: [sensor('sn-03', 'dc-sp1'), sensor('sn-01', 'dc-cps'), sensor('sn-02', 'dc-sp1')],
    });

    expect(await screen.findByText('3 sensores conectados.')).toBeInTheDocument();
    const sections = screen.getAllByRole('region', { name: /^Unidade / });
    expect(sections.map((s) => s.getAttribute('aria-label'))).toEqual([
      'Unidade dc-cps',
      'Unidade dc-sp1',
    ]);
    const sp1 = within(screen.getByRole('region', { name: 'Unidade dc-sp1' }));
    expect(sp1.getAllByRole('listitem')).toHaveLength(2);
    expect(sp1.getAllByText('Conectado')).toHaveLength(2);
  });

  it('usa o singular com um sensor so', async () => {
    setup({ sensors: [sensor('sn-01', 'dc-sp1')] });
    expect(await screen.findByText('1 sensor conectado.')).toBeInTheDocument();
  });

  it('mostra estado vazio sem sensores', async () => {
    setup();
    expect(await screen.findByText('Nenhum sensor conectado ainda.')).toBeInTheDocument();
  });

  it('mostra o erro de carregamento do backend', async () => {
    setup({ list: vi.fn().mockRejectedValue(new ApiError('Erro 403', 403)) });
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro 403');
    expect(screen.queryByText('Nenhum sensor conectado ainda.')).not.toBeInTheDocument();
  });

  it('conecta um sensor, avisa e recarrega a lista', async () => {
    const created = sensor('sn-09', 'dc-new');
    const list = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([created]);
    const { link, user } = setup({ list, link: vi.fn().mockResolvedValue(created) });
    await screen.findByText('Nenhum sensor conectado ainda.');

    await user.click(screen.getByRole('button', { name: 'Conectar sensor' }));
    const dialog = screen.getByRole('dialog', { name: 'Conectar sensor' });
    await user.type(within(dialog).getByLabelText('Identificador do sensor'), 'sn-09');
    await user.type(within(dialog).getByLabelText('Unidade'), 'dc-new');
    await user.click(within(dialog).getByRole('button', { name: 'Conectar' }));

    expect(link).toHaveBeenCalledWith({ sensorId: 'sn-09', unitId: 'dc-new' });
    expect(await screen.findByRole('region', { name: 'Unidade dc-new' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sensor sn-09 conectado.');

    await user.click(within(dialog).getByRole('button', { name: 'Concluir' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('registra leitura manual de unidade sem sensor e mostra o historico dela', async () => {
    const reading: WaterReadingView = {
      sensorId: 'manual',
      unitId: 'dc-for',
      timestamp: '2026-11-05T00:00:00.000Z',
      valueInLiters: 96,
      readingType: 'manual',
    };
    const { registerManual, listByUnit, user } = setup({
      sensors: [sensor('sn-01', 'dc-sp1')],
      listByUnit: vi.fn().mockResolvedValue([reading]),
    });
    await screen.findByText('1 sensor conectado.');

    await user.click(screen.getByRole('button', { name: 'Registrar leitura manual (sem sensor)' }));
    const dialog = screen.getByRole('dialog', { name: 'Registrar leitura manual' });
    await user.type(within(dialog).getByLabelText('Unidade'), 'dc-for');
    await user.type(within(dialog).getByLabelText('Volume consumido (litros)'), '96');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar leitura' }));

    expect(registerManual).toHaveBeenCalledWith({
      unitId: 'dc-for',
      valueInLiters: 96,
      date: '2026-11-05',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('list', { name: 'Leituras manuais de dc-for' }),
    ).toHaveTextContent('96 L');
    expect(listByUnit).toHaveBeenCalledWith('dc-for');
    expect(screen.getByRole('status')).toHaveTextContent('Leitura manual registrada.');
  });

  it('bloqueia leitura manual numa unidade que ja tem sensor, sem chamar a API', async () => {
    const { registerManual, user } = setup({ sensors: [sensor('sn-01', 'dc-sp1')] });
    await screen.findByText('1 sensor conectado.');

    await user.click(screen.getByRole('button', { name: 'Registrar leitura manual (sem sensor)' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Unidade'), 'dc-sp1');
    await user.type(within(dialog).getByLabelText('Volume consumido (litros)'), '10');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar leitura' }));

    expect(
      within(dialog).getByText(
        'A unidade dc-sp1 possui sensor conectado: leitura manual não é permitida',
      ),
    ).toBeInTheDocument();
    expect(registerManual).not.toHaveBeenCalled();
  });
});
