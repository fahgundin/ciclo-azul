import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { printReport, saveFile } from './download';

describe('saveFile', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  it('cria um link de download com o nome do arquivo, clica e limpa', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    saveFile('relatorio.csv', 'a;b', 'text/csv;charset=utf-8');

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull(); // removido do DOM

    vi.advanceTimersByTime(2000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    click.mockRestore();
  });
});

describe('printReport', () => {
  it('marca o body durante a impressao e desmarca no afterprint', () => {
    window.print = vi.fn();

    printReport();

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.body).toHaveClass('printing-report');

    window.dispatchEvent(new Event('afterprint'));
    expect(document.body).not.toHaveClass('printing-report');
  });
});
