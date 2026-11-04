import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('mostra titulo e conteudo quando aberto', () => {
    render(
      <Dialog open title="Minha conta" onClose={vi.fn()}>
        <p>Conteúdo</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Minha conta' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('nao monta o conteudo quando fechado', () => {
    render(
      <Dialog open={false} title="Minha conta" onClose={vi.fn()}>
        <p>Conteúdo</p>
      </Dialog>,
    );
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  it('fecha ao clicar no botao Fechar', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Minha conta" onClose={onClose}>
        <p>Conteúdo</p>
      </Dialog>,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fecha ao clicar no fundo, mas nao ao clicar no conteudo', () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Minha conta" onClose={onClose}>
        <p>Conteúdo</p>
      </Dialog>,
    );
    fireEvent.click(screen.getByText('Conteúdo'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fecha o elemento quando open passa para false', () => {
    const { rerender } = render(
      <Dialog open title="Minha conta" onClose={vi.fn()}>
        <p>Conteúdo</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('open');

    rerender(
      <Dialog open={false} title="Minha conta" onClose={vi.fn()}>
        <p>Conteúdo</p>
      </Dialog>,
    );
    expect(document.querySelector('dialog')).not.toHaveAttribute('open');
  });
});
