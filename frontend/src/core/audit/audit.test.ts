import { describe, it, expect } from 'vitest';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  AUDIT_DISCLAIMER,
  InMemoryAuditLog,
  NO_FILTER,
  actorsOf,
  auditFileName,
  auditToCsv,
  filterAudit,
  seedAuditEntries,
  type AuditEntry,
} from './audit';

const NOW = new Date('2026-11-07T12:00:00.000Z');

const entry = (
  id: number,
  at: string,
  actor: string,
  action: AuditEntry['action'],
): AuditEntry => ({
  id,
  at,
  actor,
  action,
  detail: `detalhe ${id}`,
});

const entries: AuditEntry[] = [
  entry(1, '2026-11-01T10:00:00.000Z', 'Ana Souza', 'user.create'),
  entry(2, '2026-11-05T23:59:59.000Z', 'Marina Costa', 'waste.register'),
  entry(3, '2026-11-06T00:00:00.000Z', 'Marina Costa', 'limit.update'),
  entry(4, '2026-11-06T00:00:00.000Z', 'Diego Alves', 'reading.manual'),
];

describe('InMemoryAuditLog — somente leitura', () => {
  it('lista os registros sem expor o estado interno (nao da para editar nem excluir)', () => {
    const log = new InMemoryAuditLog(entries);
    log.list()[0]!.detail = 'adulterado';
    log.list().pop();
    expect(log.list()).toHaveLength(4);
    expect(log.list()[0]?.detail).toBe('detalhe 1');
    // A porta nao oferece nenhuma operacao de escrita.
    expect(
      Object.keys(Object.getPrototypeOf(log)).concat(
        Object.getOwnPropertyNames(InMemoryAuditLog.prototype),
      ),
    ).not.toEqual(expect.arrayContaining(['add', 'delete', 'remove', 'update']));
  });
});

describe('seedAuditEntries', () => {
  const seed = seedAuditEntries(NOW);

  it('gera registros de demonstracao com ids unicos e acoes conhecidas, todos no passado', () => {
    expect(new Set(seed.map((e) => e.id)).size).toBe(seed.length);
    expect(seed.every((e) => AUDIT_ACTIONS.includes(e.action))).toBe(true);
    expect(seed.every((e) => Date.parse(e.at) <= NOW.getTime())).toBe(true);
  });

  it('todas as acoes tem rotulo', () => {
    for (const action of AUDIT_ACTIONS) {
      expect(AUDIT_ACTION_LABELS[action]).toBeTruthy();
    }
  });
});

describe('filterAudit', () => {
  it('sem filtro devolve tudo, do mais recente ao mais antigo (empate: maior id primeiro)', () => {
    expect(filterAudit(entries, NO_FILTER).map((e) => e.id)).toEqual([4, 3, 2, 1]);
  });

  it('filtra por acao', () => {
    expect(filterAudit(entries, { ...NO_FILTER, action: 'limit.update' }).map((e) => e.id)).toEqual(
      [3],
    );
  });

  it('filtra por autor', () => {
    expect(filterAudit(entries, { ...NO_FILTER, actor: 'Marina Costa' }).map((e) => e.id)).toEqual([
      3, 2,
    ]);
  });

  it('periodo: "de" e "ate" sao dias inclusivos (UTC)', () => {
    expect(
      filterAudit(entries, { ...NO_FILTER, from: '2026-11-05', to: '2026-11-05' }).map((e) => e.id),
    ).toEqual([2]);
    expect(filterAudit(entries, { ...NO_FILTER, from: '2026-11-06' }).map((e) => e.id)).toEqual([
      4, 3,
    ]);
    expect(filterAudit(entries, { ...NO_FILTER, to: '2026-11-01' }).map((e) => e.id)).toEqual([1]);
  });

  it('combina os filtros', () => {
    expect(
      filterAudit(entries, {
        action: 'waste.register',
        actor: 'Marina Costa',
        from: '2026-11-05',
        to: '2026-11-06',
      }).map((e) => e.id),
    ).toEqual([2]);
    expect(
      filterAudit(entries, { ...NO_FILTER, action: 'user.create', actor: 'Diego Alves' }),
    ).toEqual([]);
  });

  it('data invalida ou incompleta e ignorada', () => {
    expect(filterAudit(entries, { ...NO_FILTER, from: '2026-11', to: 'abc' })).toHaveLength(4);
  });

  it('nao altera a lista original', () => {
    const copy = [...entries];
    filterAudit(entries, NO_FILTER);
    expect(entries).toEqual(copy);
  });
});

describe('actorsOf', () => {
  it('lista os autores distintos em ordem alfabetica', () => {
    expect(actorsOf(entries)).toEqual(['Ana Souza', 'Diego Alves', 'Marina Costa']);
  });
});

describe('auditToCsv', () => {
  const csv = auditToCsv(filterAudit(entries, NO_FILTER), NOW, 'Ana Souza');

  it('comeca com BOM, usa ; e CRLF, e leva o aviso de dados de demonstracao', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(';');
    expect(csv).toContain('\r\n');
    expect(csv).toContain(AUDIT_DISCLAIMER);
    expect(csv).toContain('por Ana Souza');
  });

  it('tem o cabecalho e uma linha por registro, na ordem informada', () => {
    const lines = csv.trim().split('\r\n');
    const header = lines.findIndex((l) => l.startsWith('"Registro"'));
    expect(lines[header]).toBe('"Registro";"Data e hora";"Usuário";"Ação";"Detalhe"');
    const body = lines.slice(header + 1);
    expect(body).toHaveLength(4);
    expect(body[0]).toMatch(/^4;/);
    expect(body[0]).toContain('"Diego Alves";"Leitura manual";"detalhe 4"');
  });

  it('protege texto que comecaria uma formula na planilha', () => {
    const risky = auditToCsv([{ ...entries[0]!, detail: '=HYPERLINK("http://x")' }], NOW, 'Ana');
    expect(risky).toContain(`"'=HYPERLINK(""http://x"")"`);
  });

  it('sem registros exporta so o cabecalho', () => {
    const lines = auditToCsv([], NOW, 'Ana').trim().split('\r\n');
    expect(lines[lines.length - 1]).toBe('"Registro";"Data e hora";"Usuário";"Ação";"Detalhe"');
  });
});

describe('auditFileName', () => {
  it('usa a data de geracao', () => {
    expect(auditFileName(NOW)).toBe('ciclo-azul-auditoria-2026-11-07');
  });
});
