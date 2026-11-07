import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../../core/api/api-error';
import { formatDateTime } from '../../core/format';
import { reportFileName, reportHasData, reportToCsv } from '../../core/reports/export';
import type { ReportDataSource } from '../../core/reports/report-data-source';
import {
  REPORT_PERIODS,
  REPORT_TYPE_LABELS,
  buildReport,
  type Report,
  type ReportType,
} from '../../core/reports/report';
import { useFlash } from '../components/Flash';
import { Icon } from '../components/Icon';
import '../styles/components.css';
import '../styles/reports.css';
import { useUser } from '../UserContext';
import { printReport as defaultPrintReport, saveFile as defaultSaveFile } from './download';
import { ReportView } from './ReportView';

type Format = 'pdf' | 'csv';

interface ExportEntry {
  title: string;
  days: number;
  format: Format;
  at: string;
}

interface ReportsPageProps {
  source: ReportDataSource;
  /** Relogio, download e impressao injetaveis (testes). */
  now?: () => Date;
  saveFile?: typeof defaultSaveFile;
  printReport?: typeof defaultPrintReport;
}

/**
 * Relatorios de conformidade (R09 / HU09), em PDF (impressao do navegador) e CSV.
 *
 * ADAPTER NO CLIENTE: o backend ainda nao tem endpoint de relatorios. O relatorio
 * e gerado AQUI, no navegador, com dados reais da API (ver core/reports/report.ts),
 * e o historico de exportacoes vale so para a sessao (em memoria). Ver
 * docs/migracao-frontend.md, "Relatorios (R09)".
 */
export function ReportsPage({
  source,
  now = () => new Date(),
  saveFile = defaultSaveFile,
  printReport = defaultPrintReport,
}: ReportsPageProps): JSX.Element {
  const idPrefix = useId();
  const flash = useFlash();
  const user = useUser();
  const [type, setType] = useState<ReportType>('full');
  const [days, setDays] = useState<number>(30);
  const [format, setFormat] = useState<Format>('pdf');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exports, setExports] = useState<ExportEntry[]>([]);

  async function handleGenerate(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await source.collect();
      setReport(
        buildReport({ type, days, now: now(), generatedBy: user?.name ?? 'Usuário', ...data }),
      );
    } catch (err) {
      setReport(null);
      setError(err instanceof ApiError ? err.message : 'Falha ao gerar o relatório');
    } finally {
      setLoading(false);
    }
  }

  function handleExport(): void {
    if (!report) {
      return;
    }
    if (format === 'csv') {
      saveFile(`${reportFileName(report)}.csv`, reportToCsv(report), 'text/csv;charset=utf-8');
    } else {
      printReport();
    }
    setExports((current) =>
      [
        { title: report.meta.title, days: report.meta.days, format, at: now().toISOString() },
        ...current,
      ].slice(0, 5),
    );
    flash(format === 'csv' ? 'Arquivo CSV gerado.' : 'Use "Salvar como PDF" na impressão.');
  }

  const typeId = `${idPrefix}-type`;
  const daysId = `${idPrefix}-days`;
  const formatId = `${idPrefix}-format`;

  return (
    <section className="page">
      <h1>Relatórios de conformidade</h1>

      <div className="form">
        <div className="field">
          <label htmlFor={typeId}>Tipo de relatório</label>
          <select
            id={typeId}
            className="field__input"
            value={type}
            disabled={loading}
            onChange={(e) => {
              setType(e.target.value as ReportType);
              setReport(null);
            }}
          >
            {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={daysId}>Período</label>
          <select
            id={daysId}
            className="field__input"
            value={days}
            disabled={loading}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setReport(null);
            }}
          >
            {REPORT_PERIODS.map((period) => (
              <option key={period} value={period}>
                Últimos {period} dias
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={formatId}>Formato</label>
          <select
            id={formatId}
            className="field__input"
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
          >
            <option value="pdf">PDF (imprimir ou salvar como PDF)</option>
            <option value="csv">CSV (planilha)</option>
          </select>
        </div>

        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => void handleGenerate()}
          disabled={loading}
        >
          {loading ? 'Gerando…' : 'Gerar relatório'}
        </button>
      </div>

      <p className="hint">
        Relatório gerado no navegador com os dados da API (sensores, leituras e lotes). O backend
        ainda não tem endpoint de relatórios (R09).
      </p>

      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}

      {report && (
        <>
          <div className="glass report-card">
            <ReportView report={report} />
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={handleExport}
              disabled={!reportHasData(report)}
            >
              <Icon name="file" />
              {format === 'csv' ? 'Baixar CSV' : 'Imprimir / salvar PDF'}
            </button>
          </div>
          {createPortal(
            <div className="print-area" aria-hidden="true">
              <ReportView report={report} />
            </div>,
            document.body,
          )}
        </>
      )}

      {exports.length > 0 && (
        <section className="page__section" aria-label="Exportados nesta sessão">
          <h2>Exportados nesta sessão</h2>
          <ul className="glass list">
            {exports.map((entry) => (
              <li key={entry.at + entry.format}>
                <div className="item__title">{entry.title}</div>
                <div className="item__meta">
                  {entry.days} dias · {entry.format.toUpperCase()} · {formatDateTime(entry.at)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
