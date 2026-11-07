/** Entrega de arquivos pelo navegador (UI web): download e impressao para PDF. */

/** Baixa um arquivo de texto gerado no cliente. */
export function saveFile(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Abre o dialogo de impressao ("Salvar como PDF") mostrando so o relatorio. A
 * classe no <body> so tem efeito em @media print (ver reports.css).
 */
export function printReport(): void {
  document.body.classList.add('printing-report');
  window.addEventListener('afterprint', () => document.body.classList.remove('printing-report'), {
    once: true,
  });
  window.print();
}
