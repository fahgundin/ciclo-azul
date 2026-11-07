import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WasteLotApi } from '../../core/api/waste-lot-api';
import type { WasteTypeApi } from '../../core/api/waste-type-api';
import { InMemoryPendingLotStore } from '../../core/waste/pending-lot';
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
  render(
    <WastePage wasteApi={wasteApi} lotApi={lotApi} pendingStore={new InMemoryPendingLotStore()} />,
  );
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

  // Revisao do #54: abas ARIA sem navegacao por setas.
  describe('teclado (padrao ARIA de abas)', () => {
    it('so a aba ativa entra na ordem de Tab (tabindex roving)', () => {
      setup();
      expect(screen.getByRole('tab', { name: 'Destinação de lotes' })).toHaveAttribute(
        'tabindex',
        '0',
      );
      expect(screen.getByRole('tab', { name: 'Tipos de resíduo' })).toHaveAttribute(
        'tabindex',
        '-1',
      );
    });

    it('seta para a direita e para a esquerda trocam de aba e movem o foco (circular)', async () => {
      const { user } = setup();
      const lots = screen.getByRole('tab', { name: 'Destinação de lotes' });
      const types = screen.getByRole('tab', { name: 'Tipos de resíduo' });
      lots.focus();

      await user.keyboard('{ArrowRight}');
      expect(types).toHaveAttribute('aria-selected', 'true');
      expect(types).toHaveFocus();

      await user.keyboard('{ArrowRight}'); // volta ao inicio
      expect(lots).toHaveAttribute('aria-selected', 'true');
      expect(lots).toHaveFocus();

      await user.keyboard('{ArrowLeft}'); // do inicio vai ao fim
      expect(types).toHaveAttribute('aria-selected', 'true');
      expect(types).toHaveFocus();
    });

    it('End vai para a ultima aba e Home para a primeira', async () => {
      const { user } = setup();
      screen.getByRole('tab', { name: 'Destinação de lotes' }).focus();

      await user.keyboard('{End}');
      expect(screen.getByRole('tab', { name: 'Tipos de resíduo' })).toHaveFocus();

      await user.keyboard('{Home}');
      expect(screen.getByRole('tab', { name: 'Destinação de lotes' })).toHaveFocus();
    });
  });
});
