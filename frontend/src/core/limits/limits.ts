import type { FieldErrors } from '../forms';

/**
 * Limites diarios de consumo (R03) — core/, agnostico de UI.
 *
 * ADAPTER EM MEMORIA: o backend NAO tem endpoint de limites (R03, #12, em aberto).
 * Os limites ficam em `InMemoryLimitStore`, valem so ate recarregar a pagina e
 * existem apenas neste navegador. Quando o endpoint existir, implemente `LimitStore`
 * sobre a API. Ver docs/migracao-frontend.md.
 */

export interface ConsumptionLimits {
  /** Limite geral (soma de todas as unidades), em litros/dia; null = sem limite. */
  general: number | null;
  /** Limite por unidade, em litros/dia. Unidade ausente = sem limite. */
  units: Record<string, number>;
}

export const NO_LIMITS: ConsumptionLimits = { general: null, units: {} };

/** Porta de armazenamento dos limites (hoje em memoria; amanha, a API). */
export interface LimitStore {
  get(): ConsumptionLimits;
  save(limits: ConsumptionLimits): void;
}

const copy = (limits: ConsumptionLimits): ConsumptionLimits => ({
  general: limits.general,
  units: { ...limits.units },
});

/** ADAPTER EM MEMORIA dos limites (perde tudo ao recarregar). */
export class InMemoryLimitStore implements LimitStore {
  private limits: ConsumptionLimits = copy(NO_LIMITS);

  get(): ConsumptionLimits {
    return copy(this.limits);
  }

  save(limits: ConsumptionLimits): void {
    this.limits = copy(limits);
  }
}

export const LIMIT_INVALID_MESSAGE = 'Informe um valor numérico maior que zero';

/** Campo vazio = sem limite; senao precisa ser um numero finito maior que zero. */
function parseLimit(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export interface LimitFormValues {
  general: string;
  /** Texto de cada campo de unidade, por unidade. */
  units: Record<string, string>;
}

export interface LimitValidation {
  /** Erros por campo: 'general' ou 'unit:<unitId>'. */
  errors: FieldErrors<string>;
  /** Limites prontos para salvar; so existe quando nao ha erros. */
  limits: ConsumptionLimits | null;
}

export function validateLimits(values: LimitFormValues): LimitValidation {
  const errors: FieldErrors<string> = {};
  const units: Record<string, number> = {};

  const general = parseLimit(values.general);
  if (general === undefined) {
    errors.general = LIMIT_INVALID_MESSAGE;
  }

  for (const [unitId, text] of Object.entries(values.units)) {
    const parsed = parseLimit(text);
    if (parsed === undefined) {
      errors[`unit:${unitId}`] = LIMIT_INVALID_MESSAGE;
    } else if (parsed !== null) {
      units[unitId] = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, limits: null };
  }
  return { errors, limits: { general: general ?? null, units } };
}
