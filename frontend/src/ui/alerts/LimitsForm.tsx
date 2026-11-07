import { useId, useState, type FormEvent } from 'react';
import {
  validateLimits,
  type ConsumptionLimits,
  type LimitFormValues,
} from '../../core/limits/limits';
import type { FieldErrors } from '../../core/forms';
import { Icon } from '../components/Icon';

interface LimitsFormProps {
  /** Unidades conhecidas (e, junto, as que ja tem limite). */
  units: readonly string[];
  initial: ConsumptionLimits;
  onSave: (limits: ConsumptionLimits) => void;
  onClose: () => void;
}

const text = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value);

/**
 * Definicao dos limites diarios de consumo, em litros/dia (R03 / HU04): geral e por
 * unidade. Campo vazio = sem limite. Os limites vao para o adapter em memoria.
 */
export function LimitsForm({ units, initial, onSave, onClose }: LimitsFormProps): JSX.Element {
  const idPrefix = useId();
  const [values, setValues] = useState<LimitFormValues>({
    general: text(initial.general),
    units: Object.fromEntries(units.map((unit) => [unit, text(initial.units[unit])])),
  });
  const [errors, setErrors] = useState<FieldErrors<string>>({});

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const result = validateLimits(values);
    setErrors(result.errors);
    if (result.limits) {
      onSave(result.limits);
      onClose();
    }
  }

  const field = (key: string, label: string, value: string, onChange: (v: string) => void) => (
    <div className="field" key={key}>
      <label htmlFor={`${idPrefix}-${key}`}>{label}</label>
      <input
        id={`${idPrefix}-${key}`}
        className="field__input"
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `${idPrefix}-${key}-error` : undefined}
      />
      {errors[key] && (
        <p className="field__error" id={`${idPrefix}-${key}-error`}>
          <Icon name="alert" size={16} />
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <form className="form" onSubmit={handleSubmit} noValidate aria-label="Definir limites">
      <p className="hint">
        Ao passar de 80% e de 100% do limite do dia, a tela de alertas avisa. Deixe em branco para
        não ter limite.
      </p>
      {field('general', 'Geral (todas as unidades), litros/dia', values.general, (general) =>
        setValues((current) => ({ ...current, general })),
      )}
      {units.map((unit) =>
        field(`unit:${unit}`, `${unit}, litros/dia`, values.units[unit] ?? '', (value) =>
          setValues((current) => ({ ...current, units: { ...current.units, [unit]: value } })),
        ),
      )}
      <button type="submit" className="btn btn--primary btn--block">
        Salvar limites
      </button>
    </form>
  );
}
