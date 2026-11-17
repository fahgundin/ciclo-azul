import { useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  AUDIT_DISCLAIMER,
  NO_FILTER,
  actorsOf,
  auditFileName,
  auditToCsv,
  filterAudit,
  type AuditAction,
  type AuditLog,
} from '../../core/audit/audit';
import { formatDateTime } from '../../core/format';
import { useFlash } from '../components/Flash';
import { Icon } from '../components/Icon';
import '../styles/audit.css';
import '../styles/components.css';
import '../styles/reports.css';
import { useUser } from '../UserContext';
import {
  printReport as defaultPrintReport,
  saveFile as defaultSaveFile,
} from '../reports/download';

interface AuditPageProps {
  /** ADAPTER EM MEMORIA do historico (RNF02): so leitura. */
  log: AuditLog;
  /** Relogio, download e impressao injetaveis (testes). */
  now?: () => Date;
  saveFile?: typeof defaultSaveFile;
  printReport?: typeof defaultPrintReport;
}

/**
 * Historico de auditoria (RNF02) — somente leitura, para o Administrador.
 *
 * DADOS DE DEMONSTRACAO: o backend nao tem trilha de auditoria e as telas nao registram
 * suas acoes; os registros vem de um adapter em memoria (ver core/audit/audit.ts). Nao ha
 * como editar nem excluir um registro. A exportacao (CSV e PDF pela impressao do
 * navegador) respeita os filtros aplicados.
 */
export function AuditPage({
  log,
  now = () => new Date(),
  saveFile = defaultSaveFile,
  printReport = defaultPrintReport,
}: AuditPageProps): JSX.Element {
  const idPrefix = useId();
  const flash = useFlash();
  const user = useUser();
  const [action, setAction] = useState<AuditAction | null>(null);
  const [actor, setActor] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const all = useMemo(() => log.list(), [log]);
  const actors = useMemo(() => actorsOf(all), [all]);
  const entries = filterAudit(all, { ...NO_FILTER, action, actor, from, to });
  const filtered = action !== null || actor !== null || from !== '' || to !== '';

  function clearFilters(): void {
    setAction(null);
    setActor(null);
    setFrom('');
    setTo('');
  }

  function handleCsv(): void {
    const generatedAt = now();
    saveFile(
      `${auditFileName(generatedAt)}.csv`,
      auditToCsv(entries, generatedAt, user?.name ?? 'Usuário'),
      'text/csv;charset=utf-8',
    );
    flash('Arquivo CSV gerado.');
  }

  function handlePdf(): void {
    printReport();
    flash('Use "Salvar como PDF" na impressão.');
  }

  const actionId = `${idPrefix}-action`;
  const actorId = `${idPrefix}-actor`;
  const fromId = `${idPrefix}-from`;
  const toId = `${idPrefix}-to`;

  return (
    <section className="page">
      <h1>Auditoria</h1>

      <p className="hint">
        Dados de demonstração: o backend ainda não tem trilha de auditoria (RNF02) e as telas não
        registram as ações, então este histórico não reflete o que foi feito no sistema. Não há como
        editar nem excluir registros.
      </p>

      <div className="form audit-filters" role="search" aria-label="Filtros do histórico">
        <div className="field">
          <label htmlFor={actionId}>Ação</label>
          <select
            id={actionId}
            className="field__input"
            value={action ?? ''}
            onChange={(e) =>
              setAction(e.target.value === '' ? null : (e.target.value as AuditAction))
            }
          >
            <option value="">Todas</option>
            {AUDIT_ACTIONS.map((value) => (
              <option key={value} value={value}>
                {AUDIT_ACTION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={actorId}>Usuário</label>
          <select
            id={actorId}
            className="field__input"
            value={actor ?? ''}
            onChange={(e) => setActor(e.target.value === '' ? null : e.target.value)}
          >
            <option value="">Todos</option>
            {actors.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={fromId}>De</label>
          <input
            id={fromId}
            className="field__input"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={toId}>Até</label>
          <input
            id={toId}
            className="field__input"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="actions">
        {filtered && (
          <button type="button" className="btn" onClick={clearFilters}>
            Limpar filtros
          </button>
        )}
        <button type="button" className="btn" onClick={handleCsv} disabled={entries.length === 0}>
          <Icon name="file" />
          Exportar CSV
        </button>
        <button type="button" className="btn" onClick={handlePdf} disabled={entries.length === 0}>
          <Icon name="file" />
          Exportar PDF
        </button>
      </div>

      <p className="hint" aria-live="polite">
        {entries.length} de {all.length} registro(s){filtered ? ' com os filtros aplicados' : ''}. A
        exportação inclui só o que está listado.
      </p>

      {entries.length === 0 ? (
        <p className="list-empty">
          {all.length === 0
            ? 'Nenhum registro no histórico.'
            : 'Nenhum registro com os filtros aplicados.'}
        </p>
      ) : (
        <ul className="glass list" aria-label="Histórico de auditoria">
          {entries.map((entry) => (
            <li key={entry.id}>
              <div className="audit-entry__head">
                <span className="item__title">{AUDIT_ACTION_LABELS[entry.action]}</span>
                <span className="item__meta">{formatDateTime(entry.at)}</span>
              </div>
              <div>{entry.detail}</div>
              <div className="item__meta">
                #{entry.id} · {entry.actor}
              </div>
            </li>
          ))}
        </ul>
      )}

      {createPortal(
        <div className="print-area" aria-hidden="true">
          <h2>Histórico de auditoria</h2>
          <p>
            Gerado em {formatDateTime(now().toISOString())} por {user?.name ?? 'Usuário'}
          </p>
          <p>
            <strong>Atenção:</strong> {AUDIT_DISCLAIMER}
          </p>
          <table>
            <thead>
              <tr>
                <th>Registro</th>
                <th>Data e hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.id}</td>
                  <td>{formatDateTime(entry.at)}</td>
                  <td>{entry.actor}</td>
                  <td>{AUDIT_ACTION_LABELS[entry.action]}</td>
                  <td>{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
        document.body,
      )}
    </section>
  );
}
