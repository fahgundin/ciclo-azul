import { describe, it, expect } from 'vitest';
import type {
  SensorView,
  WasteLotView,
  WasteTypeView,
  WaterReadingView,
} from '@ciclo-azul/contracts';
import { buildReport, type ReportInput } from './report';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

const sensor = (sensorId: string, unitId: string): SensorView => ({
  sensorId,
  unitId,
  status: 'connected',
  linkedAt: daysAgo(40),
});
const reading = (
  unitId: string,
  timestamp: string,
  valueInLiters: number,
  readingType: 'sensor' | 'manual' = 'sensor',
): WaterReadingView => ({
  sensorId: readingType === 'manual' ? 'manual' : 'sn',
  unitId,
  timestamp,
  valueInLiters,
  readingType,
});
const lot = (id: string, date: string, over: Partial<WasteLotView> = {}): WasteLotView => ({
  id,
  wasteTypeId: 'wt-1',
  location: 'Paulínia/SP',
  receiverCompany: 'EcoQuímica',
  license: 'LO-1',
  date,
  quantity: 100,
  proofReference: 'mtr-1.pdf',
  status: 'destined',
  ...over,
});
const TYPES: WasteTypeView[] = [{ id: 'wt-1', name: 'Óleo', classification: 'Metal pesado' }];

function input(over: Partial<ReportInput> = {}): ReportInput {
  return {
    type: 'full',
    days: 30,
    now: NOW,
    generatedBy: 'Marina Costa',
    sensors: [sensor('sn-1', 'dc-sp1'), sensor('sn-2', 'dc-cps')],
    readingsByUnit: {
      'dc-sp1': [
        reading('dc-sp1', minutesAgo(5), 10.255),
        reading('dc-sp1', daysAgo(2), 20, 'manual'),
        reading('dc-sp1', daysAgo(45), 999), // fora do periodo
      ],
      'dc-cps': [reading('dc-cps', minutesAgo(3), 7)],
    },
    lots: [lot('l-old', daysAgo(10)), lot('l-new', daysAgo(1)), lot('l-out', daysAgo(60))],
    wasteTypes: TYPES,
    ...over,
  };
}

describe('buildReport — consumo de agua', () => {
  it('soma as leituras do periodo por unidade, em ordem alfabetica, ignorando as de fora', () => {
    const { water } = buildReport(input());
    expect(water.map((w) => w.unitId)).toEqual(['dc-cps', 'dc-sp1']);
    const sp1 = water[1]!;
    expect(sp1.liters).toBe(30.26); // 10,255 + 20, arredondado a 2 casas
    expect(sp1.readings).toBe(2);
    expect(sp1.sensorReadings).toBe(1);
    expect(sp1.manualReadings).toBe(1);
    expect(sp1.lastReadingAt).toBe(minutesAgo(5));
  });

  it('unidade sem leituras no periodo aparece zerada', () => {
    const { water } = buildReport(input({ readingsByUnit: { 'dc-sp1': [], 'dc-cps': [] } }));
    expect(water.every((w) => w.liters === 0 && w.readings === 0 && w.lastReadingAt === null)).toBe(
      true,
    );
  });

  it('inclui unidades que so aparecem nas leituras', () => {
    const { water } = buildReport(
      input({
        sensors: [],
        readingsByUnit: { 'dc-for': [reading('dc-for', daysAgo(1), 5, 'manual')] },
      }),
    );
    expect(water.map((w) => w.unitId)).toEqual(['dc-for']);
  });

  it('respeita o tamanho do periodo (7 dias exclui leitura de 10 dias)', () => {
    const { water } = buildReport(
      input({
        days: 7,
        readingsByUnit: {
          'dc-sp1': [reading('dc-sp1', daysAgo(10), 50), reading('dc-sp1', daysAgo(6), 5)],
        },
      }),
    );
    expect(water.find((w) => w.unitId === 'dc-sp1')?.liters).toBe(5);
  });
});

describe('buildReport — residuos', () => {
  it('traz so os lotes do periodo, do mais recente ao mais antigo, com o nome do tipo', () => {
    const { waste } = buildReport(input());
    expect(waste.map((w) => w.lotId)).toEqual(['l-new', 'l-old']);
    expect(waste[0]).toMatchObject({
      wasteType: 'Óleo',
      classification: 'Metal pesado',
      receiverCompany: 'EcoQuímica',
      proofReference: 'mtr-1.pdf',
    });
  });

  it('usa um nome padrao quando o tipo do lote nao existe mais', () => {
    const { waste } = buildReport(
      input({ lots: [lot('l', daysAgo(1), { wasteTypeId: 'sumiu' })] }),
    );
    expect(waste[0]).toMatchObject({ wasteType: 'Tipo de resíduo removido', classification: '—' });
  });
});

describe('buildReport — tipos de relatorio', () => {
  it('"water" nao traz residuos nem itens verificados', () => {
    const r = buildReport(input({ type: 'water' }));
    expect(r.water.length).toBeGreaterThan(0);
    expect(r.waste).toEqual([]);
    expect(r.checks).toEqual([]);
    expect(r.meta.title).toBe('Consumo de água');
  });

  it('"waste" nao traz consumo nem itens verificados', () => {
    const r = buildReport(input({ type: 'waste' }));
    expect(r.water).toEqual([]);
    expect(r.waste.length).toBeGreaterThan(0);
    expect(r.checks).toEqual([]);
    expect(r.meta.title).toBe('Destinação de resíduos');
  });

  it('registra periodo, autor e instante da geracao', () => {
    expect(buildReport(input({ days: 7 })).meta).toMatchObject({
      type: 'full',
      title: 'Conformidade ambiental completa',
      days: 7,
      generatedAt: NOW.toISOString(),
      generatedBy: 'Marina Costa',
    });
  });
});

describe('buildReport — itens verificados (relatorio completo)', () => {
  it('atende quando ha comprovante, leitura recente e consumo em todas as unidades', () => {
    const { checks } = buildReport(input());
    expect(checks).toHaveLength(3);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it('nao atende leitura recente quando uma unidade esta ha mais de 15 minutos sem dados', () => {
    const { checks } = buildReport(
      input({
        readingsByUnit: {
          'dc-sp1': [reading('dc-sp1', minutesAgo(5), 1)],
          'dc-cps': [reading('dc-cps', minutesAgo(16), 1)],
        },
      }),
    );
    const recent = checks.find(
      (c) => c.label === 'Unidades com leitura recente no momento da geração',
    )!;
    expect(recent.ok).toBe(false);
    expect(recent.detail).toContain('1 sem leitura nos 15 minutos anteriores à geração');
    expect(recent.detail).toContain('não se refere ao período escolhido');
  });

  it('considera sem leitura recente a unidade que nunca teve leitura', () => {
    const { checks } = buildReport(input({ readingsByUnit: { 'dc-sp1': [], 'dc-cps': [] } }));
    expect(
      checks.find((c) => c.label === 'Unidades com leitura recente no momento da geração')?.ok,
    ).toBe(false);
    expect(
      checks.find((c) => c.label === 'Consumo registrado em todas as unidades no período')?.ok,
    ).toBe(false);
  });

  it('nao atende o comprovante/licenca quando algum lote vem sem eles', () => {
    const { checks } = buildReport(
      input({ lots: [lot('l', daysAgo(1), { proofReference: '  ' })] }),
    );
    const proof = checks.find((c) => c.label.startsWith('Comprovante'))!;
    expect(proof.ok).toBe(false);
    expect(proof.detail).toBe('1 destinação(ões), 1 sem comprovante ou licença');
  });

  it('nao cria itens "atende" vazios quando nao ha lotes nem unidades', () => {
    expect(buildReport(input({ sensors: [], readingsByUnit: {}, lots: [] })).checks).toEqual([]);
  });
});
