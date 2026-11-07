import { describe, it, expect } from 'vitest';
import type { UnitConsumptionStatus, WasteTypeView } from '@ciclo-azul/contracts';
import { NO_LIMITS, type ConsumptionLimits } from '../limits/limits';
import type { PendingLot } from '../waste/pending-lot';
import { evaluateAlerts, type AlertInput } from './alerts';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const TYPES: WasteTypeView[] = [{ id: 'wt-1', name: 'Óleo', classification: 'Metal pesado' }];

const live = (unitId: string): UnitConsumptionStatus => ({
  unitId,
  state: 'live',
  currentValueInLiters: 1,
  lastReadingAt: '2026-11-07T11:59:00.000Z',
  lastReadingType: 'sensor',
  staleAfterMinutes: 15,
});

function input(over: Partial<AlertInput> = {}): AlertInput {
  return {
    now: NOW,
    statuses: [live('dc-sp1')],
    consumptionToday: { 'dc-sp1': 0 },
    limits: NO_LIMITS,
    pendingLots: [],
    wasteTypes: TYPES,
    ...over,
  };
}

const limits = (over: Partial<ConsumptionLimits>): ConsumptionLimits => ({ ...NO_LIMITS, ...over });
const pending = (id: string, generatedAt: string, deadlineDays: number): PendingLot => ({
  id,
  wasteTypeId: 'wt-1',
  quantity: 120,
  generatedAt,
  deadlineDays,
});

describe('evaluateAlerts — limite de consumo (R03 / HU04)', () => {
  // Cenario: Gerar alerta ao ultrapassar o limite (10.000 L/dia, consumo de 10.500 L)
  it('gera alerta critico quando o consumo do dia passa do limite da unidade', () => {
    const [alert, ...rest] = evaluateAlerts(
      input({
        limits: limits({ units: { 'dc-sp1': 10000 } }),
        consumptionToday: { 'dc-sp1': 10500 },
      }),
    );
    expect(rest).toEqual([]);
    expect(alert).toMatchObject({ kind: 'limit', level: 'crit', title: 'Limite excedido: dc-sp1' });
    expect(alert?.body).toBe('Consumo de hoje em 10.500 L, acima do limite de 10.000 L.');
  });

  it('abaixo do limite e do aviso nao gera alerta', () => {
    expect(
      evaluateAlerts(
        input({
          limits: limits({ units: { 'dc-sp1': 10000 } }),
          consumptionToday: { 'dc-sp1': 7900 },
        }),
      ),
    ).toEqual([]);
  });

  it('a partir de 80% do limite gera aviso "Perto do limite"', () => {
    const [alert] = evaluateAlerts(
      input({
        limits: limits({ units: { 'dc-sp1': 10000 } }),
        consumptionToday: { 'dc-sp1': 8000 },
      }),
    );
    expect(alert).toMatchObject({ kind: 'limit', level: 'warn', title: 'Perto do limite: dc-sp1' });
    expect(alert?.body).toContain('80% do limite diário');
  });

  it('exatamente no limite e aviso; so acima e "excedido"', () => {
    const [atLimit] = evaluateAlerts(
      input({
        limits: limits({ units: { 'dc-sp1': 10000 } }),
        consumptionToday: { 'dc-sp1': 10000 },
      }),
    );
    expect(atLimit?.level).toBe('warn');
    const [over] = evaluateAlerts(
      input({
        limits: limits({ units: { 'dc-sp1': 10000 } }),
        consumptionToday: { 'dc-sp1': 10000.5 },
      }),
    );
    expect(over?.level).toBe('crit');
  });

  it('unidade sem limite definido nao gera alerta, por maior que seja o consumo', () => {
    expect(evaluateAlerts(input({ consumptionToday: { 'dc-sp1': 999999 } }))).toEqual([]);
  });

  it('unidade sem consumo registrado hoje conta como zero', () => {
    expect(
      evaluateAlerts(input({ limits: limits({ units: { 'dc-sp1': 100 } }), consumptionToday: {} })),
    ).toEqual([]);
  });

  it('o limite geral considera a soma de todas as unidades', () => {
    const [alert] = evaluateAlerts(
      input({
        limits: limits({ general: 1000 }),
        consumptionToday: { 'dc-sp1': 600, 'dc-cps': 500 },
      }),
    );
    expect(alert).toMatchObject({ level: 'crit', title: 'Limite excedido: consumo geral' });
  });
});

describe('evaluateAlerts — lote sem destinacao (R08 / HU08)', () => {
  // Cenario: Gerar alerta de lote vencido sem destinacao
  it('gera alerta critico para lote gerado ha mais tempo que o prazo', () => {
    const [alert] = evaluateAlerts(
      input({ pendingLots: [pending('P-0001', '2026-09-01T12:00:00.000Z', 30)] }),
    );
    expect(alert).toMatchObject({
      kind: 'waste',
      level: 'crit',
      title: 'Lote P-0001 sem destinação',
    });
    expect(alert?.body).toBe('Óleo (120): prazo venceu há 37 dia(s).');
  });

  // Cenario: Nao alertar lote dentro do prazo
  it('lote dentro do prazo nao gera alerta (nem "vence em N dias")', () => {
    expect(
      evaluateAlerts(input({ pendingLots: [pending('P-0001', '2026-11-06T12:00:00.000Z', 30)] })),
    ).toEqual([]);
    // faltando 1 dia: ainda dentro do prazo, ainda sem alerta
    expect(
      evaluateAlerts(input({ pendingLots: [pending('P-0002', '2026-10-09T12:00:00.000Z', 30)] })),
    ).toEqual([]);
  });

  it('vencido ha menos de um dia diz "venceu hoje"', () => {
    const [alert] = evaluateAlerts(
      input({ pendingLots: [pending('P-0001', '2026-10-08T06:00:00.000Z', 30)] }),
    );
    expect(alert?.body).toContain('prazo venceu hoje');
  });

  it('usa um nome padrao quando o tipo do lote nao existe mais', () => {
    const [alert] = evaluateAlerts(
      input({ wasteTypes: [], pendingLots: [pending('P-0001', '2026-01-01T00:00:00.000Z', 1)] }),
    );
    expect(alert?.body).toContain('Tipo de resíduo removido');
  });
});

describe('evaluateAlerts — unidade sem dados recentes', () => {
  it('alerta apenas unidades que tinham leitura e pararam (stale)', () => {
    const stale: UnitConsumptionStatus = {
      ...live('dc-rj2'),
      state: 'stale',
      lastReadingAt: '2026-11-07T10:00:00.000Z',
    };
    const noData: UnitConsumptionStatus = {
      ...live('dc-new'),
      state: 'no-data',
      lastReadingAt: null,
      currentValueInLiters: null,
      lastReadingType: null,
    };
    const alerts = evaluateAlerts(input({ statuses: [live('dc-sp1'), stale, noData] }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      kind: 'sensor',
      level: 'warn',
      title: 'Sem dados recentes: dc-rj2',
    });
  });
});

describe('evaluateAlerts — ordem', () => {
  it('criticos vem antes dos avisos', () => {
    const stale: UnitConsumptionStatus = { ...live('dc-rj2'), state: 'stale' };
    const alerts = evaluateAlerts(
      input({
        statuses: [stale],
        limits: limits({ units: { 'dc-sp1': 100 } }),
        consumptionToday: { 'dc-sp1': 500 },
        pendingLots: [pending('P-1', '2026-01-01T00:00:00.000Z', 1)],
      }),
    );
    expect(alerts.map((a) => a.level)).toEqual(['crit', 'crit', 'warn']);
    expect(alerts[2]?.kind).toBe('sensor');
  });
});
