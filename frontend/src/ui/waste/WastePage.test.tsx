import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WasteLotApi } from '../../core/api/waste-lot-api';
import type { WasteTypeApi } from '../../core/api/waste-type-api';
import { WastePage } from './WastePage';

function setup() {
  const lotApi = {
    list: vi.fn().mockResolvedValue([]),
    register: vi.fn(),
  } as unknown as WasteLotApi;
  const wasteApi = {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  } as unknown as WasteTypeApi;
  render(<WastePage wasteApi={wasteApi} lotApi={lotApi} />);
  return { lotApi, wasteApi, user: userEvent.setup() };
}

describe('WastePage', () => {
  it('abre na aba de lotes (HU07)', async () => {
    setup();
    expect(screen.getByRole('tab', { name: 'Destinação de lotes' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByRole('heading', { name: 'Destinação de lotes' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tipos de resíduo' })).not.toBeInTheDocument();
  });

  it('alterna para a aba de tipos de residuo (HU06) e volta', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('tab', { name: 'Tipos de resíduo' }));

    expect(screen.getByRole('tab', { name: 'Tipos de resíduo' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('heading', { name: 'Tipos de resíduo' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Destinação de lotes' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Destinação de lotes' }));
    expect(await screen.findByRole('heading', { name: 'Destinação de lotes' })).toBeInTheDocument();
  });

  it('recarrega os tipos ao voltar para os lotes (tipo recem-cadastrado aparece no formulario)', async () => {
    const { wasteApi, user } = setup();
    await screen.findByRole('heading', { name: 'Destinação de lotes' });
    expect(wasteApi.list).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('tab', { name: 'Tipos de resíduo' }));
    await user.click(screen.getByRole('tab', { name: 'Destinação de lotes' }));
    await screen.findByRole('heading', { name: 'Destinação de lotes' });

    // 1 (lotes) + 1 (aba de tipos) + 1 (lotes de novo)
    expect(wasteApi.list).toHaveBeenCalledTimes(3);
  });
});
