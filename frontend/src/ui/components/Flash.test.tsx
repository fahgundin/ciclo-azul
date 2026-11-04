import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FLASH_DURATION_MS, FlashProvider, useFlash } from './Flash';

function Trigger({ level }: { level?: 'info' | 'warn' }) {
  const flash = useFlash();
  return <button onClick={() => flash('Salvo com sucesso', level)}>disparar</button>;
}

describe('Flash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mostra a mensagem na regiao de status e some depois do tempo', () => {
    render(
      <FlashProvider>
        <Trigger />
      </FlashProvider>,
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    fireEvent.click(screen.getByText('disparar'));
    expect(screen.getByRole('status')).toHaveTextContent('Salvo com sucesso');

    act(() => {
      vi.advanceTimersByTime(FLASH_DURATION_MS);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('usa o estilo de alerta no nivel warn', () => {
    render(
      <FlashProvider>
        <Trigger level="warn" />
      </FlashProvider>,
    );
    fireEvent.click(screen.getByText('disparar'));
    expect(screen.getByText('Salvo com sucesso')).toHaveClass('flash--warn');
  });

  it('uma nova mensagem reinicia o tempo da anterior', () => {
    render(
      <FlashProvider>
        <Trigger />
      </FlashProvider>,
    );
    fireEvent.click(screen.getByText('disparar'));
    act(() => {
      vi.advanceTimersByTime(FLASH_DURATION_MS - 1000);
    });
    fireEvent.click(screen.getByText('disparar'));
    act(() => {
      vi.advanceTimersByTime(FLASH_DURATION_MS - 1000);
    });
    // Passou mais que a duracao desde o 1o disparo, mas nao desde o 2o.
    expect(screen.getByRole('status')).toHaveTextContent('Salvo com sucesso');
  });

  it('fora do provedor nao quebra nem mostra nada', () => {
    render(<Trigger />);
    expect(() => fireEvent.click(screen.getByText('disparar'))).not.toThrow();
  });
});
