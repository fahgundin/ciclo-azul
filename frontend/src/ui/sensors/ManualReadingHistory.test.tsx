import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WaterReadingView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { WaterReadingApi } from '../../core/api/water-reading-api';
import { ManualReadingHistory } from './ManualReadingHistory';

const manual = (value: number, timestamp: string): WaterReadingView => ({
  sensorId: 'manual',
  unitId: 'dc-for',
  timestamp,
  valueInLiters: value,
  readingType: 'manual',
});
const sensor: WaterReadingView = {
  sensorId: 'sn-01',
  unitId: 'dc-for',
  timestamp: '2026-11-05T10:00:00.000Z',
  valueInLiters: 7,
  readingType: 'sensor',
};

function setup(
  props: { unitId?: string | null; version?: number } = {},
  listByUnit = vi.fn().mockResolvedValue([]),
) {
  const api = { listByUnit } as unknown as WaterReadingApi;
  const onSelectUnit = vi.fn();
  const view = render(
    <ManualReadingHistory
      api={api}
      unitId={props.unitId === undefined ? 'dc-for' : props.unitId}
      units={['dc-for']}
      onSelectUnit={onSelectUnit}
      version={props.version ?? 0}
    />,
  );
  return { listByUnit, onSelectUnit, view, api, user: userEvent.setup() };
}

describe('ManualReadingHistory (R04)', () => {
  it('sem unidade escolhida orienta a consultar e nao chama a API', () => {
    const { listByUnit } = setup({ unitId: null });
    expect(screen.getByText(/Informe a unidade para ver as leituras/)).toBeInTheDocument();
    expect(listByUnit).not.toHaveBeenCalled();
  });

  it('lista so as leituras manuais, com volume em litros e a data de calendario em UTC', async () => {
    setup(
      {},
      vi
        .fn()
        .mockResolvedValue([
          manual(1234.5, '2026-11-05T00:00:00.000Z'),
          sensor,
          manual(80, '2026-11-01T00:00:00.000Z'),
        ]),
    );

    const list = await screen.findByRole('list', { name: 'Leituras manuais de dc-for' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('1.234,5 L');
    expect(items[0]).toHaveTextContent('05/11/2026');
    expect(items[1]).toHaveTextContent('80 L');
    expect(items[1]).toHaveTextContent('01/11/2026');
  });

  it('mostra estado vazio quando nao ha leituras manuais', async () => {
    setup({}, vi.fn().mockResolvedValue([sensor]));
    expect(
      await screen.findByText('Nenhuma leitura manual registrada para esta unidade.'),
    ).toBeInTheDocument();
  });

  it('mostra o erro do backend ao falhar', async () => {
    setup({}, vi.fn().mockRejectedValue(new ApiError('A unidade é obrigatória', 400)));
    expect(await screen.findByRole('alert')).toHaveTextContent('A unidade é obrigatória');
  });

  it('consultar escolhe a unidade digitada, sem espacos', async () => {
    const { onSelectUnit, user } = setup({ unitId: null });
    await user.type(screen.getByLabelText('Unidade'), '  dc-for ');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(onSelectUnit).toHaveBeenCalledWith('dc-for');
  });

  it('nao consulta com o campo vazio', async () => {
    const { onSelectUnit, user } = setup({ unitId: null });
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(onSelectUnit).not.toHaveBeenCalled();
  });

  it('recarrega quando a versao muda', async () => {
    const { listByUnit, view, api, onSelectUnit } = setup({ version: 0 });
    await screen.findByRole('list');
    expect(listByUnit).toHaveBeenCalledTimes(1);

    view.rerender(
      <ManualReadingHistory
        api={api}
        unitId="dc-for"
        units={[]}
        onSelectUnit={onSelectUnit}
        version={1}
      />,
    );
    await screen.findByRole('list');
    expect(listByUnit).toHaveBeenCalledTimes(2);
  });
});
