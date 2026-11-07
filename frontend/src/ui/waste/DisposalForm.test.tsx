import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WasteLotView, WasteTypeView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { WasteLotApi } from '../../core/api/waste-lot-api';
import { DisposalForm } from './DisposalForm';

// Meio-dia local de 05/11/2026: data local e UTC coincidem em qualquer fuso.
const NOW = new Date(2026, 10, 5, 12, 0);
const TYPES: WasteTypeView[] = [
  { id: 'wt-1', name: 'Óleo de refrigeração', classification: 'Metal pesado' },
];
const LOT: WasteLotView = {
  id: 'l-1',
  wasteTypeId: 'wt-1',
  location: 'Paulínia/SP',
  receiverCompany: 'EcoQuímica Ambiental',
  license: 'LO-2043/2025',
  date: '2026-11-05T00:00:00.000Z',
  quantity: 800,
  proofReference: 'mtr-0140.pdf',
  status: 'destined',
};

function setup(register = vi.fn().mockResolvedValue(LOT), types = TYPES) {
  const api = { register } as unknown as WasteLotApi;
  const onRegistered = vi.fn();
  const onClose = vi.fn();
  render(
    <DisposalForm
      api={api}
      wasteTypes={types}
      now={() => NOW}
      onRegistered={onRegistered}
      onClose={onClose}
    />,
  );
  return { register, onRegistered, onClose, user: userEvent.setup() };
}

async function fillValid(user: ReturnType<typeof userEvent.setup>, proof = 'mtr-0140.pdf') {
  await user.selectOptions(screen.getByLabelText('Tipo de resíduo'), 'wt-1');
  await user.type(screen.getByLabelText('Local da destinação'), ' Paulínia/SP ');
  await user.type(screen.getByLabelText('Empresa receptora'), 'EcoQuímica Ambiental');
  await user.type(screen.getByLabelText('Licença da empresa'), 'LO-2043/2025');
  await user.type(screen.getByLabelText('Quantidade destinada'), '800');
  if (proof) {
    await user.type(screen.getByLabelText(/Comprovante de destinação/), proof);
  }
}

describe('DisposalForm (R06 / HU07)', () => {
  it('comeca com a data de hoje e nao permite data futura', () => {
    setup();
    const date = screen.getByLabelText('Data da destinação');
    expect(date).toHaveValue('2026-11-05');
    expect(date).toHaveAttribute('max', '2026-11-05');
  });

  it('lista os tipos de residuo cadastrados', () => {
    setup();
    expect(
      screen.getByRole('option', { name: 'Óleo de refrigeração — Metal pesado' }),
    ).toBeInTheDocument();
  });

  it('orienta a cadastrar um tipo quando nao ha nenhum', () => {
    setup(undefined, []);
    expect(screen.getByText(/Cadastre um tipo de resíduo/)).toBeInTheDocument();
  });

  it('valida todos os campos sem chamar a API', async () => {
    const { register, user } = setup();
    await user.clear(screen.getByLabelText('Data da destinação'));
    await user.click(screen.getByRole('button', { name: 'Registrar destinação' }));

    expect(screen.getByText('O tipo de resíduo é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('O local da destinação é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('A empresa receptora é obrigatória')).toBeInTheDocument();
    expect(screen.getByText('A licença é obrigatória')).toBeInTheDocument();
    expect(
      screen.getByText('A data da destinação é inválida ou está no futuro'),
    ).toBeInTheDocument();
    expect(screen.getByText('A quantidade destinada deve ser maior que zero')).toBeInTheDocument();
    expect(screen.getByText('O comprovante de destinação é obrigatório')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  // Cenario: Impedir registro sem comprovante
  it('bloqueia o registro sem comprovante com a mensagem exata', async () => {
    const { register, user } = setup();
    await fillValid(user, '');
    await user.click(screen.getByRole('button', { name: 'Registrar destinação' }));

    expect(screen.getByText('O comprovante de destinação é obrigatório')).toBeInTheDocument();
    expect(screen.getByLabelText(/Comprovante de destinação/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(register).not.toHaveBeenCalled();
  });

  // Cenario: Registrar destinacao completa de um lote
  it('registra a destinacao completa, avisa a tela e fecha', async () => {
    const { register, onRegistered, onClose, user } = setup();
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Registrar destinação' }));

    expect(register).toHaveBeenCalledWith({
      wasteTypeId: 'wt-1',
      location: 'Paulínia/SP',
      receiverCompany: 'EcoQuímica Ambiental',
      license: 'LO-2043/2025',
      date: '2026-11-05',
      quantity: 800,
      proofReference: 'mtr-0140.pdf',
    });
    expect(onRegistered).toHaveBeenCalledWith(LOT);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro do backend (ex.: tipo nao encontrado) e mantem o formulario aberto', async () => {
    const register = vi.fn().mockRejectedValue(new ApiError('Tipo de resíduo não encontrado', 400));
    const { onRegistered, onClose, user } = setup(register);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Registrar destinação' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tipo de resíduo não encontrado');
    expect(onRegistered).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('usa mensagem generica para falhas de rede', async () => {
    const { user } = setup(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Registrar destinação' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao registrar a destinação');
  });
});
