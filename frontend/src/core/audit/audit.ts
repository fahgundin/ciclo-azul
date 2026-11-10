import { csvText } from '../reports/export';
import { formatDateTime } from '../format';

/**
 * Historico de auditoria (RNF02) — core/, agnostico de UI.
 *
 * ADAPTER EM MEMORIA / DADOS DE DEMONSTRACAO: o backend NAO tem trilha de auditoria
 * (RNF02, em aberto) e as telas atuais NAO registram suas acoes. Os registros vem de
 * `seedAuditEntries` (inspirados no prototipo), valem so ate recarregar e nao refletem o
 * que foi feito no sistema. A porta `AuditLog` so LE: nao ha como editar nem excluir um
 * registro (a imutabilidade real exige tabela somente de insercao no backend). Ver
 * docs/migracao-frontend.md.
 */

export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.logout',
  'user.create',
  'user.update',
  'sensor.connect',
  'reading.manual',
  'limit.update',
  'waste.register',
  'insight.apply',
  'report.export',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  'auth.login': 'Acesso',
  'auth.logout': 'Saída',
  'user.create': 'Usuário criado',
  'user.update': 'Usuário alterado',
  'sensor.connect': 'Sensor conectado',
  'reading.manual': 'Leitura manual',
  'limit.update': 'Limite alterado',
  'waste.register': 'Destinação registrada',
  'insight.apply': 'Oportunidade aplicada',
  'report.export': 'Relatório exportado',
};

export interface AuditEntry {
  id: number;
  /** ISO 8601 do momento da acao. */
  at: string;
  /** Nome de quem fez a acao. */
  actor: string;
  action: AuditAction;
  detail: string;
}

/** Porta do historico de auditoria: SOMENTE leitura (hoje em memoria; amanha, a API). */
export interface AuditLog {
  list(): AuditEntry[];
}

/** ADAPTER EM MEMORIA do historico (perde tudo ao recarregar). */
export class InMemoryAuditLog implements AuditLog {
  private readonly entries: readonly AuditEntry[];

  constructor(entries: readonly AuditEntry[]) {
    this.entries = entries.map((entry) => ({ ...entry }));
  }

  list(): AuditEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Registros de DEMONSTRACAO, relativos a `now` (nao sao acoes reais do sistema). */
export function seedAuditEntries(now: Date): AuditEntry[] {
  const at = (daysAgo: number, hoursAgo = 0): string =>
    new Date(now.getTime() - daysAgo * DAY_MS - hoursAgo * HOUR_MS).toISOString();
  return [
    { id: 1, at: at(30), actor: 'Ana Souza', action: 'auth.login', detail: 'Acesso ao sistema' },
    {
      id: 2,
      at: at(28),
      actor: 'Ana Souza',
      action: 'user.create',
      detail: 'Diego Alves criado com nível Operador',
    },
    {
      id: 3,
      at: at(22),
      actor: 'Marina Costa',
      action: 'waste.register',
      detail: 'Lote L-0121 destinado',
    },
    {
      id: 4,
      at: at(15),
      actor: 'Diego Alves',
      action: 'sensor.connect',
      detail: 'Sensor hidrometro-torre-a vinculado à unidade dc-sp1',
    },
    {
      id: 5,
      at: at(11),
      actor: 'Marina Costa',
      action: 'waste.register',
      detail: 'Lote L-0129 destinado',
    },
    {
      id: 6,
      at: at(7),
      actor: 'Marina Costa',
      action: 'limit.update',
      detail: 'Limite geral alterado para 3.000 L/dia',
    },
    {
      id: 7,
      at: at(4),
      actor: 'Diego Alves',
      action: 'reading.manual',
      detail: 'Leitura manual de 1.200 L na unidade dc-cps',
    },
    {
      id: 8,
      at: at(2),
      actor: 'Marina Costa',
      action: 'insight.apply',
      detail: 'Oportunidade "Reaproveitar a água de purga das torres" aplicada em dc-sp1',
    },
    {
      id: 9,
      at: at(1),
      actor: 'Ana Souza',
      action: 'user.update',
      detail: 'Paulo Nunes: unidades alteradas',
    },
    {
      id: 10,
      at: at(0, 3),
      actor: 'Marina Costa',
      action: 'report.export',
      detail: 'Relatório de conformidade (30 dias) exportado em CSV',
    },
  ];
}

export interface AuditFilter {
  /** `null` = todas as acoes. */
  action: AuditAction | null;
  /** `null` = todos os autores. */
  actor: string | null;
  /** Data inicial (AAAA-MM-DD, UTC, inclusiva); vazio = sem limite. */
  from: string;
  /** Data final (AAAA-MM-DD, UTC, inclusiva); vazio = sem limite. */
  to: string;
}

export const NO_FILTER: AuditFilter = { action: null, actor: null, from: '', to: '' };

/** Inicio do dia (UTC) de `AAAA-MM-DD`; `null` se vazio ou invalido. */
function dayStart(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(time) ? null : time;
}

/** Filtra e ordena do mais recente para o mais antigo (empate: maior id primeiro). */
export function filterAudit(entries: readonly AuditEntry[], filter: AuditFilter): AuditEntry[] {
  const from = dayStart(filter.from);
  const toStart = dayStart(filter.to);
  const to = toStart === null ? null : toStart + DAY_MS;
  return entries
    .filter((entry) => {
      const time = Date.parse(entry.at);
      return (
        (filter.action === null || entry.action === filter.action) &&
        (filter.actor === null || entry.actor === filter.actor) &&
        (from === null || time >= from) &&
        (to === null || time < to)
      );
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.id - a.id);
}

/** Autores distintos, em ordem alfabetica. */
export function actorsOf(entries: readonly AuditEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.actor))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}

/** Aviso que acompanha o historico exportado: ele nao e prova de auditoria. */
export const AUDIT_DISCLAIMER =
  'Dados de demonstração: o sistema ainda não tem trilha de auditoria (RNF02) e este histórico não reflete as ações reais.';

const BOM = String.fromCharCode(0xfeff);

/** CSV (`;`, BOM, mesmas protecoes contra formula do relatorio) dos registros informados. */
export function auditToCsv(
  entries: readonly AuditEntry[],
  generatedAt: Date,
  generatedBy: string,
): string {
  const header = ['Registro', 'Data e hora', 'Usuário', 'Ação', 'Detalhe'].map(csvText).join(';');
  const lines = [
    csvText('Histórico de auditoria'),
    csvText(`Gerado em ${formatDateTime(generatedAt.toISOString())} por ${generatedBy}`),
    csvText(`Atenção: ${AUDIT_DISCLAIMER}`),
    '',
    header,
    ...entries.map((entry) =>
      [
        String(entry.id),
        csvText(formatDateTime(entry.at)),
        csvText(entry.actor),
        csvText(AUDIT_ACTION_LABELS[entry.action]),
        csvText(entry.detail),
      ].join(';'),
    ),
  ];
  return BOM + lines.join('\r\n') + '\r\n';
}

/** Nome do arquivo exportado: `ciclo-azul-auditoria-AAAA-MM-DD`. */
export function auditFileName(generatedAt: Date): string {
  return `ciclo-azul-auditoria-${generatedAt.toISOString().slice(0, 10)}`;
}
