import type { Report } from '../../core/reports/report';
import { reportHasData } from '../../core/reports/export';
import { formatDateTime, formatDateUtc, formatNumber } from '../../core/format';
import { Icon } from '../components/Icon';

/**
 * Relatorio de conformidade renderizado como documento (HTML semantico). E o mesmo
 * componente da pre-visualizacao na tela e da area de impressao (PDF).
 */
export function ReportView({ report }: { report: Report }): JSX.Element {
  return (
    <article className="report">
      <header>
        <h2>{report.meta.title}</h2>
        <p className="muted">
          Últimos {report.meta.days} dias · gerado em {formatDateTime(report.meta.generatedAt)} por{' '}
          {report.meta.generatedBy}
        </p>
      </header>

      {!reportHasData(report) && <p className="list-empty">Não há dados no período selecionado.</p>}

      {report.checks.length > 0 && (
        <section>
          <h3>Itens verificados</h3>
          <ul className="report__checks">
            {report.checks.map((check) => (
              <li key={check.label}>
                <div>
                  <div className="item__title">{check.label}</div>
                  <div className="item__meta">{check.detail}</div>
                </div>
                <span className={check.ok ? 'tag' : 'tag tag--warn'}>
                  <Icon name={check.ok ? 'check' : 'alert'} size={14} />
                  {check.ok ? 'Atende' : 'Não atende'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.water.length > 0 && (
        <section>
          <h3>Consumo de água</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Unidade</th>
                  <th>Consumo (L)</th>
                  <th>Leituras</th>
                  <th>Última leitura</th>
                </tr>
              </thead>
              <tbody>
                {report.water.map((row) => (
                  <tr key={row.unitId}>
                    <td>{row.unitId}</td>
                    <td>{formatNumber(row.liters)}</td>
                    <td>
                      {row.readings} ({row.sensorReadings} sensor, {row.manualReadings} manual)
                    </td>
                    <td>{row.lastReadingAt ? formatDateTime(row.lastReadingAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {report.waste.length > 0 && (
        <section>
          <h3>Destinação de resíduos</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Resíduo</th>
                  <th>Quantidade</th>
                  <th>Data</th>
                  <th>Empresa receptora</th>
                  <th>Local</th>
                  <th>Licença</th>
                  <th>Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {report.waste.map((row) => (
                  <tr key={row.lotId}>
                    <td>
                      {row.wasteType} ({row.classification})
                    </td>
                    <td>{formatNumber(row.quantity)}</td>
                    <td>{formatDateUtc(row.date)}</td>
                    <td>{row.receiverCompany}</td>
                    <td>{row.location}</td>
                    <td>{row.license}</td>
                    <td>{row.proofReference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </article>
  );
}
