import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NO_LIMITS, type ConsumptionLimits } from '../../core/limits/limits';
import { LimitsForm } from './LimitsForm';

function setup(initial: ConsumptionLimits = NO_LIMITS) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <LimitsForm units={['dc-cps', 'dc-sp1']} initial={initial} onSave={onSave} onClose={onClose} />,
  );
  return { onSave, onClose, user: userEvent.setup() };
}

describe('LimitsForm (R03 / HU04)', () => {
  it('tem um campo geral e um por unidade, em litros/dia', () => {
    setup();
    expect(screen.getByLabelText('Geral (todas as unidades), litros/dia')).toBeInTheDocument();
    expect(screen.getByLabelText('dc-cps, litros/dia')).toBeInTheDocument();
    expect(screen.getByLabelText('dc-sp1, litros/dia')).toBeInTheDocument();
  });

  it('mostra os limites ja definidos', () => {
    setup({ general: 30000, units: { 'dc-sp1': 10000 } });
    expect(screen.getByLabelText('Geral (todas as unidades), litros/dia')).toHaveValue(30000);
    expect(screen.getByLabelText('dc-sp1, litros/dia')).toHaveValue(10000);
    expect(screen.getByLabelText('dc-cps, litros/dia')).toHaveValue(null);
  });

  // Cenario: Cadastrar limite de consumo por unidade (10.000 litros/dia)
  it('salva o limite de 10.000 litros/dia de uma unidade; campos vazios ficam sem limite', async () => {
    const { onSave, onClose, user } = setup();
    await user.type(screen.getByLabelText('dc-sp1, litros/dia'), '10000');
    await user.click(screen.getByRole('button', { name: 'Salvar limites' }));

    expect(onSave).toHaveBeenCalledWith({ general: null, units: { 'dc-sp1': 10000 } });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('rejeita zero e negativo, indicando o campo, sem salvar', async () => {
    const { onSave, onClose, user } = setup();
    await user.type(screen.getByLabelText('dc-sp1, litros/dia'), '0');
    await user.type(screen.getByLabelText('dc-cps, litros/dia'), '-5');
    await user.click(screen.getByRole('button', { name: 'Salvar limites' }));

    expect(screen.getAllByText('Informe um valor numérico maior que zero')).toHaveLength(2);
    expect(screen.getByLabelText('dc-sp1, litros/dia')).toHaveAttribute('aria-invalid', 'true');
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('apagar um limite existente o remove', async () => {
    const { onSave, user } = setup({ general: null, units: { 'dc-sp1': 10000 } });
    await user.clear(screen.getByLabelText('dc-sp1, litros/dia'));
    await user.click(screen.getByRole('button', { name: 'Salvar limites' }));
    expect(onSave).toHaveBeenCalledWith({ general: null, units: {} });
  });

  // Revisao do #57: texto recusado pelo navegador (ex.: "1e") chega como '' e virava "sem limite".
  it('texto invalido digitado no campo numerico nao vira "sem limite": mostra erro e nao salva', () => {
    const { onSave, onClose } = setup({ general: null, units: { 'dc-sp1': 10000 } });
    const input = screen.getByLabelText('dc-sp1, litros/dia');
    // jsdom nao calcula badInput; o navegador real marca isso quando o texto e recusado.
    Object.defineProperty(input, 'validity', { value: { badInput: true }, configurable: true });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar limites' }));

    expect(screen.getByText('Informe um valor numérico maior que zero')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('depois de corrigir o texto invalido, o campo volta a ser aceito', () => {
    const { onSave } = setup({ general: null, units: { 'dc-sp1': 10000 } });
    const input = screen.getByLabelText('dc-sp1, litros/dia');
    Object.defineProperty(input, 'validity', { value: { badInput: true }, configurable: true });
    fireEvent.change(input, { target: { value: '' } });
    Object.defineProperty(input, 'validity', { value: { badInput: false }, configurable: true });
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar limites' }));

    expect(onSave).toHaveBeenCalledWith({ general: null, units: { 'dc-sp1': 500 } });
  });
});
