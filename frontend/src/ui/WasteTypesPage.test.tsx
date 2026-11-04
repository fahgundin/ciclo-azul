import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WasteTypesPage } from './WasteTypesPage';
import { ApiError } from '../core/api/api-error';
import type { WasteTypeApi } from '../core/api/waste-type-api';

function fakeApi(overrides: Partial<WasteTypeApi> = {}): WasteTypeApi {
  return {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: '1', name: 'X', classification: 'Y' }),
    ...overrides,
  } as unknown as WasteTypeApi;
}

describe('WasteTypesPage (R07)', () => {
  it('lista os tipos existentes ao montar', async () => {
    const api = fakeApi({
      list: vi
        .fn()
        .mockResolvedValue([{ id: '1', name: 'Óleo de refrigeração', classification: 'Metal pesado' }]),
    });
    render(<WasteTypesPage api={api} />);
    expect(await screen.findByText(/Óleo de refrigeração — Metal pesado/)).toBeInTheDocument();
  });

  // Cenario: Cadastrar um novo tipo de residuo
  it('cadastra um tipo e atualiza a listagem', async () => {
    const user = userEvent.setup();
    const list = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: '2', name: 'Solvente', classification: 'Químico' }]);
    const create = vi.fn().mockResolvedValue({ id: '2', name: 'Solvente', classification: 'Químico' });
    const api = fakeApi({ list, create });

    render(<WasteTypesPage api={api} />);
    await user.type(screen.getByLabelText('Nome'), 'Solvente');
    await user.type(screen.getByLabelText('Classificação'), 'Químico');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(create).toHaveBeenCalledWith({ name: 'Solvente', classification: 'Químico' });
    expect(await screen.findByText(/Solvente — Químico/)).toBeInTheDocument();
  });

  // Cenario: Impedir cadastro sem classificacao
  it('exibe a mensagem exata quando o backend bloqueia sem classificacao', async () => {
    const user = userEvent.setup();
    const create = vi
      .fn()
      .mockRejectedValue(new ApiError('A classificação do resíduo é obrigatória', 400));
    const api = fakeApi({ create });

    render(<WasteTypesPage api={api} />);
    await user.type(screen.getByLabelText('Nome'), 'Óleo');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A classificação do resíduo é obrigatória',
      );
    });
  });
});
