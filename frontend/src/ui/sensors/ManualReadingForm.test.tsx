import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../core/api/api-error';
import type { WaterReadingApi } from '../../core/api/water-reading-api';
import { ManualReadingForm } from './ManualReadingForm';

// Meio-dia local de 05/11/2026: a data local e a data UTC coincidem em qualquer fuso.
const NOW = new Date(2026, 10, 5, 12, 0);

function setup(registerManual = vi.fn().mockResolvedValue({})) {
  const api = { registerManual } as unknown as WaterReadingApi;
  const onRegistered = vi.fn();
  const onClose = vi.fn();
  render(
    <ManualReadingForm
      api={api}
      units={[]}
      connectedUnits={['dc-sp1']}
      now={() => NOW}
      onRegistered={onRegistered}
      onClose={onClose}
    />,
  );
  return { registerManual, onRegistered, onClose, user: userEvent.setup() };
}

describe('ManualReadingForm (R04)', () => {
  it('comeca com a data de hoje e limita o seletor aos ultimos 28 dias', () => {
    setup();
    const date = screen.getByLabelText('Data da leitura');
    expect(date).toHaveValue('2026-11-05');
    expect(date).toHaveAttribute('max', '2026-11-05');
    expect(date).toHaveAttribute('min', '2026-10-08');
  });

  it('valida unidade, volume e data sem chamar a API', async () => {
    const { registerManual, user } = setup();
    await user.clear(screen.getByLabelText('Data da leitura'));
    await user.click(screen.getByRole('button', { name: 'Registrar leitura' }));

    expect(screen.getByText('A unidade é obrigatória')).toBeInTheDocument();
    expect(screen.getByText('O volume da leitura deve ser maior que zero')).toBeInTheDocument();
    expect(
      screen.getByText('A data da leitura deve estar entre hoje e os últimos 28 dias'),
    ).toBeInTheDocument();
    expect(registerManual).not.toHaveBeenCalled();
  });

  it('bloqueia unidade com sensor conectado, com a mesma mensagem do backend', async () => {
    const { registerManual, user } = setup();
    await user.type(screen.getByLabelText('Unidade'), 'dc-sp1');
    await user.type(screen.getByLabelText('Volume consumido (litros)'), '50');
    await user.click(screen.getByRole('button', { name: 'Registrar leitura' }));

    expect(
      screen.getByText('A unidade dc-sp1 possui sensor conectado: leitura manual não é permitida'),
    ).toBeInTheDocument();
    expect(registerManual).not.toHaveBeenCalled();
  });

  it('rejeita volume zero', async () => {
    const { registerManual, user } = setup();
    await user.type(screen.getByLabelText('Unidade'), 'dc-for');
    await user.type(screen.getByLabelText('Volume consumido (litros)'), '0');
    await user.click(screen.getByRole('button', { name: 'Registrar leitura' }));

    expect(screen.getByText('O volume da leitura deve ser maior que zero')).toBeInTheDocument();
    expect(registerManual).not.toHaveBeenCalled();
  });

  it('registra a leitura, avisa a tela e fecha', async () => {
    const { registerManual, onRegistered, onClose, user } = setup();
    await user.type(screen.getByLabelText('Unidade'), '  dc-for ');
    await user.type(screen.getByLabelText('Volume consumido (litros)'), '96.5');
    await user.click(screen.getByRole('button', { name: 'Registrar leitura' }));

    expect(registerManual).toHaveBeenCalledWith({
      unitId: 'dc-for',
      valueInLiters: 96.5,
      date: '2026-11-05',
    });
    expect(onRegistered).toHaveBeenCalledWith('dc-for');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro do backend e mantem o formulario aberto', async () => {
    const registerManual = vi
      .fn()
      .mockRejectedValue(
        new ApiError(
          'A unidade dc-for possui sensor conectado: leitura manual não é permitida',
          409,
        ),
      );
    const { onRegistered, onClose, user } = setup(registerManual);
    await user.type(screen.getByLabelText('Unidade'), 'dc-for');
    await user.type(screen.getByLabelText('Volume consumido (litros)'), '10');
    await user.click(screen.getByRole('button', { name: 'Registrar leitura' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('possui sensor conectado');
    expect(onRegistered).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('usa uma mensagem generica para falhas de rede', async () => {
    const { user } = setup(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await user.type(screen.getByLabelText('Unidade'), 'dc-for');
    await user.type(screen.getByLabelText('Volume consumido (litros)'), '10');
    await user.click(screen.getByRole('button', { name: 'Registrar leitura' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao registrar a leitura');
  });
});
