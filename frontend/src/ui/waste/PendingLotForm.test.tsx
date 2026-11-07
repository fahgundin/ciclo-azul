import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PendingLotForm } from './PendingLotForm';

const TYPES = [{ id: 'wt-1', name: 'Óleo', classification: 'Metal pesado' }];

function setup() {
  const onAdd = vi.fn();
  const onClose = vi.fn();
  render(<PendingLotForm wasteTypes={TYPES} onAdd={onAdd} onClose={onClose} />);
  return { onAdd, onClose, user: userEvent.setup() };
}

describe('PendingLotForm (R08)', () => {
  it('comeca com o prazo padrao de demonstracao e avisa que ele e ficticio', () => {
    setup();
    expect(screen.getByLabelText('Prazo para destinar (dias)')).toHaveValue(30);
    expect(screen.getByText(/prazo oficial ainda não foi definido/)).toBeInTheDocument();
  });

  it('valida tipo, quantidade e prazo sem criar o lote', async () => {
    const { onAdd, onClose, user } = setup();
    await user.clear(screen.getByLabelText('Prazo para destinar (dias)'));
    await user.click(screen.getByRole('button', { name: 'Criar lote' }));

    expect(screen.getByText('O tipo de resíduo é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('A quantidade deve ser maior que zero')).toBeInTheDocument();
    expect(
      screen.getByText('O prazo deve ser um número inteiro de dias maior que zero'),
    ).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cria o lote com os valores informados e fecha', async () => {
    const { onAdd, onClose, user } = setup();
    await user.selectOptions(screen.getByLabelText('Tipo de resíduo'), 'wt-1');
    await user.type(screen.getByLabelText('Quantidade gerada'), '340.5');
    await user.clear(screen.getByLabelText('Prazo para destinar (dias)'));
    await user.type(screen.getByLabelText('Prazo para destinar (dias)'), '15');
    await user.click(screen.getByRole('button', { name: 'Criar lote' }));

    expect(onAdd).toHaveBeenCalledWith({ wasteTypeId: 'wt-1', quantity: 340.5, deadlineDays: 15 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('rejeita prazo fracionado', async () => {
    const { onAdd, user } = setup();
    await user.selectOptions(screen.getByLabelText('Tipo de resíduo'), 'wt-1');
    await user.type(screen.getByLabelText('Quantidade gerada'), '1');
    await user.clear(screen.getByLabelText('Prazo para destinar (dias)'));
    await user.type(screen.getByLabelText('Prazo para destinar (dias)'), '2.5');
    await user.click(screen.getByRole('button', { name: 'Criar lote' }));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
