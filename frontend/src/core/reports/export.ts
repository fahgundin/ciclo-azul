import { formatDateTime, formatDateUtc } from '../format';
import { CONSUMPTION_COLUMN_LABEL, REPORT_DISCLAIMER, type Report } from './report';

/**
 * Exportacao do relatorio para CSV (core/, agnostico de UI). O PDF sai pela
 * impressao do navegador ("Salvar como PDF"), feita na UI.
 */

/** Celula de numero para planilha pt-BR: virgula decimal, sem aspas. */
export function csvNumber(value: number): string {
  return String(value).replace('.', ',');
}

/**
 * Celula de texto entre aspas. Textos que comecam com = + - @ (ou tab/CR) levam
 * um apostrofo na frente para a planilha nao executa-los como formula (CSV injection).
 */
export function csvText(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Marca de ordem de bytes (U+FEFF): faz o Excel abrir o CSV como UTF-8. */
const BOM = String.fromCharCode(0xfeff);

const SEP = ';';
const EOL = '\r\n';

const row = (cells: readonly string[]): string => cells.join(SEP);

/** CSV com separador `;` e BOM, para o Excel abrir com acentos. */
export function reportToCsv(report: Report): string {
  const lines: string[] = [
    row([
      csvText(report.meta.title),
      csvText(
        `Gerado em ${formatDateTime(report.meta.generatedAt)} por ${report.meta.generatedBy}`,
      ),
    ]),
    csvText(`Período: últimos ${report.meta.days} dias`),
    csvText(`Atenção: ${REPORT_DISCLAIMER}`),
  ];

  if (report.water.length > 0) {
    lines.push(
      '',
      csvText('CONSUMO DE ÁGUA'),
      row(
        [
          'Unidade',
          CONSUMPTION_COLUMN_LABEL,
          'Leituras',
          'Leituras de sensor',
          'Leituras manuais',
          'Última leitura',
        ].map(csvText),
      ),
      ...report.water.map((w) =>
        row([
          csvText(w.unitId),
          csvNumber(w.liters),
          csvNumber(w.readings),
          csvNumber(w.sensorReadings),
          csvNumber(w.manualReadings),
          csvText(w.lastReadingAt ? formatDateTime(w.lastReadingAt) : ''),
        ]),
      ),
    );
  }

  if (report.waste.length > 0) {
    lines.push(
      '',
      csvText('RESÍDUOS'),
      row(
        [
          'Lote',
          'Resíduo',
          'Classificação',
          'Quantidade',
          'Data',
          'Empresa receptora',
          'Local',
          'Licença',
          'Comprovante',
          'Situação',
        ].map(csvText),
      ),
      ...report.waste.map((w) =>
        row([
          csvText(w.lotId),
          csvText(w.wasteType),
          csvText(w.classification),
          csvNumber(w.quantity),
          csvText(formatDateUtc(w.date)),
          csvText(w.receiverCompany),
          csvText(w.location),
          csvText(w.license),
          csvText(w.proofReference),
          csvText('Destinado'),
        ]),
      ),
    );
  }

  if (report.checks.length > 0) {
    lines.push(
      '',
      csvText('CONFORMIDADE'),
      row(['Item', 'Atende', 'Detalhe'].map(csvText)),
      ...report.checks.map((c) =>
        row([csvText(c.label), csvText(c.ok ? 'Sim' : 'Não'), csvText(c.detail)]),
      ),
    );
  }

  return `${BOM}${lines.join(EOL)}`;
}

/** Nome do arquivo exportado, ex.: ciclo-azul-full-2026-11-07. */
export function reportFileName(report: Report): string {
  return `ciclo-azul-${report.meta.type}-${report.meta.generatedAt.slice(0, 10)}`;
}

/** O relatorio tem algum dado para exportar? */
export function reportHasData(report: Report): boolean {
  return report.water.length > 0 || report.waste.length > 0 || report.checks.length > 0;
}
