import {
  STALE_AFTER_MINUTES,
  type SensorView,
  type WasteLotView,
  type WasteTypeView,
  type WaterReadingView,
} from '@ciclo-azul/contracts';

/**
 * Relatorio de conformidade ambiental (R09) — core/, agnostico de UI.
 *
 * ADAPTER NO CLIENTE: o backend ainda NAO tem endpoint de relatorios (R09 em
 * aberto). O relatorio e montado AQUI, no navegador, a partir de dados reais ja
 * expostos pela API (sensores, leituras, lotes e tipos de residuo). Quando o
 * endpoint existir, esta funcao e o ponto a substituir. Ver docs/migracao-frontend.md.
 */

export type ReportType = 'full' | 'water' | 'waste';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  full: 'Conformidade ambiental completa',
  water: 'Consumo de água',
  waste: 'Destinação de resíduos',
};

/** Periodos oferecidos, em dias. */
export const REPORT_PERIODS = [7, 30, 90] as const;

export interface ReportInput {
  type: ReportType;
  /** Tamanho do periodo, contado para tras a partir de `now`. */
  days: number;
  now: Date;
  generatedBy: string;
  sensors: readonly SensorView[];
  /** Historico de leituras por unidade (sensor e manual). */
  readingsByUnit: Readonly<Record<string, readonly WaterReadingView[]>>;
  lots: readonly WasteLotView[];
  wasteTypes: readonly WasteTypeView[];
}

export interface WaterRow {
  unitId: string;
  /** Soma das leituras do periodo, em litros. */
  liters: number;
  readings: number;
  sensorReadings: number;
  manualReadings: number;
  /** ISO 8601 da leitura mais recente do periodo; null se nao houve. */
  lastReadingAt: string | null;
}

export interface WasteRow {
  lotId: string;
  wasteType: string;
  classification: string;
  quantity: number;
  /** ISO 8601 (data de calendario, meia-noite UTC). */
  date: string;
  receiverCompany: string;
  location: string;
  license: string;
  proofReference: string;
}

export interface ReportCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface Report {
  meta: {
    type: ReportType;
    title: string;
    days: number;
    generatedAt: string;
    generatedBy: string;
  };
  water: WaterRow[];
  waste: WasteRow[];
  /** Itens verificados; so no relatorio completo. */
  checks: ReportCheck[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const UNKNOWN_TYPE = 'Tipo de resíduo removido';

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Monta o relatorio (funcao pura: o relogio entra por `input.now`). */
export function buildReport(input: ReportInput): Report {
  const nowMs = input.now.getTime();
  const fromMs = nowMs - input.days * DAY_MS;
  const inPeriod = (iso: string): boolean => {
    const time = Date.parse(iso);
    return time >= fromMs && time <= nowMs;
  };

  const units = [
    ...new Set([...input.sensors.map((s) => s.unitId), ...Object.keys(input.readingsByUnit)]),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const water: WaterRow[] = units.map((unitId) => {
    const inRange = (input.readingsByUnit[unitId] ?? []).filter((r) => inPeriod(r.timestamp));
    const latest = inRange.reduce<string | null>(
      (best, r) => (best === null || r.timestamp > best ? r.timestamp : best),
      null,
    );
    return {
      unitId,
      liters: round2(inRange.reduce((sum, r) => sum + r.valueInLiters, 0)),
      readings: inRange.length,
      sensorReadings: inRange.filter((r) => r.readingType === 'sensor').length,
      manualReadings: inRange.filter((r) => r.readingType === 'manual').length,
      lastReadingAt: latest,
    };
  });

  const typeById = new Map(input.wasteTypes.map((t) => [t.id, t]));
  const waste: WasteRow[] = input.lots
    .filter((lot) => inPeriod(lot.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((lot) => ({
      lotId: lot.id,
      wasteType: typeById.get(lot.wasteTypeId)?.name ?? UNKNOWN_TYPE,
      classification: typeById.get(lot.wasteTypeId)?.classification ?? '—',
      quantity: lot.quantity,
      date: lot.date,
      receiverCompany: lot.receiverCompany,
      location: lot.location,
      license: lot.license,
      proofReference: lot.proofReference,
    }));

  return {
    meta: {
      type: input.type,
      title: REPORT_TYPE_LABELS[input.type],
      days: input.days,
      generatedAt: input.now.toISOString(),
      generatedBy: input.generatedBy,
    },
    water: input.type === 'waste' ? [] : water,
    waste: input.type === 'water' ? [] : waste,
    checks: input.type === 'full' ? buildChecks(input, units, water, waste, nowMs) : [],
  };
}

/**
 * Itens verificados: apenas fatos que os dados permitem confirmar. Cada item so
 * entra quando ha o que verificar (sem lotes/unidades, nao ha "atende" vazio).
 */
function buildChecks(
  input: ReportInput,
  units: readonly string[],
  water: readonly WaterRow[],
  waste: readonly WasteRow[],
  nowMs: number,
): ReportCheck[] {
  const checks: ReportCheck[] = [];

  if (waste.length > 0) {
    const missing = waste.filter((w) => !w.proofReference.trim() || !w.license.trim()).length;
    checks.push({
      label: 'Comprovante e licença informados em toda destinação',
      ok: missing === 0,
      detail: `${waste.length} destinação(ões), ${missing} sem comprovante ou licença`,
    });
  }

  if (units.length > 0) {
    const staleAfterMs = STALE_AFTER_MINUTES * 60 * 1000;
    const stale = units.filter((unitId) => {
      const readings = input.readingsByUnit[unitId] ?? [];
      const latest = readings.reduce(
        (best, r) => Math.max(best, Date.parse(r.timestamp)),
        -Infinity,
      );
      return !(nowMs - latest <= staleAfterMs);
    }).length;
    checks.push({
      label: 'Unidades com leitura recente',
      ok: stale === 0,
      detail: `${units.length} unidade(s), ${stale} sem leitura nos últimos ${STALE_AFTER_MINUTES} minutos`,
    });

    const withoutConsumption = water.filter((row) => row.readings === 0).length;
    checks.push({
      label: 'Consumo registrado em todas as unidades no período',
      ok: withoutConsumption === 0,
      detail: `${units.length} unidade(s), ${withoutConsumption} sem leituras no período`,
    });
  }

  return checks;
}
