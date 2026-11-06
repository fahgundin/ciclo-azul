import { useId, useState, type FormEvent } from 'react';
import { ApiError } from '../../core/api/api-error';
import type { WaterReadingApi } from '../../core/api/water-reading-api';
import {
  earliestManualReadingDate,
  toDateInputValue,
  validateManualReading,
  type FieldErrors,
} from '../../core/sensors/validation';
import { Icon } from '../components/Icon';

interface ManualReadingFormProps {
  api: WaterReadingApi;
  /** Unidades ja conhecidas (sugestoes do campo de unidade). */
  units: readonly string[];
  /** Unidades com sensor conectado: leitura manual nao e permitida nelas. */
  connectedUnits: readonly string[];
  /** Relogio injetavel (testes). */
  now?: () => Date;
  /** Chamado apos registrar com sucesso, com a unidade da leitura. */
  onRegistered: (unitId: string) => void;
  onClose: () => void;
}

/**
 * Formulario de leitura manual de consumo (R04), para unidade sem sensor.
 * O volume e informado em litros, como o contrato da API.
 */
export function ManualReadingForm({
  api,
  units,
  connectedUnits,
  now = () => new Date(),
  onRegistered,
  onClose,
}: ManualReadingFormProps): JSX.Element {
  const idPrefix = useId();
  const [unitId, setUnitId] = useState('');
  const [volume, setVolume] = useState('');
  const [date, setDate] = useState(() => toDateInputValue(now()));
  const [errors, setErrors] = useState<FieldErrors<'unitId' | 'volume' | 'date'>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setServerError(null);
    const current = now();
    const input = {
      unitId,
      volume: volume.trim() === '' ? Number.NaN : Number(volume),
      date,
    };
    const found = validateManualReading(input, { now: current, connectedUnitIds: connectedUnits });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSubmitting(true);
    try {
      await api.registerManual({
        unitId: input.unitId.trim(),
        valueInLiters: input.volume,
        date: input.date,
      });
      onRegistered(input.unitId.trim());
      onClose();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Falha ao registrar a leitura');
    } finally {
      setSubmitting(false);
    }
  }

  const unitField = `${idPrefix}-unit`;
  const volumeField = `${idPrefix}-volume`;
  const dateField = `${idPrefix}-date`;
  const unitList = `${idPrefix}-units`;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate aria-label="Registrar leitura manual">
      <p className="hint">
        Use quando a unidade não tem sensor. O volume entra no consumo do dia informado.
      </p>

      <div className="field">
        <label htmlFor={unitField}>Unidade</label>
        <input
          id={unitField}
          className="field__input"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          list={unitList}
          autoComplete="off"
          aria-invalid={errors.unitId ? true : undefined}
          aria-describedby={errors.unitId ? `${unitField}-error` : undefined}
        />
        <datalist id={unitList}>
          {units.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
        {errors.unitId && (
          <p className="field__error" id={`${unitField}-error`}>
            <Icon name="alert" size={16} />
            {errors.unitId}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={volumeField}>Volume consumido (litros)</label>
        <input
          id={volumeField}
          className="field__input"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          aria-invalid={errors.volume ? true : undefined}
          aria-describedby={errors.volume ? `${volumeField}-error` : undefined}
        />
        {errors.volume && (
          <p className="field__error" id={`${volumeField}-error`}>
            <Icon name="alert" size={16} />
            {errors.volume}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={dateField}>Data da leitura</label>
        <input
          id={dateField}
          className="field__input"
          type="date"
          value={date}
          min={earliestManualReadingDate(now())}
          max={toDateInputValue(now())}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={errors.date ? true : undefined}
          aria-describedby={errors.date ? `${dateField}-error` : undefined}
        />
        {errors.date && (
          <p className="field__error" id={`${dateField}-error`}>
            <Icon name="alert" size={16} />
            {errors.date}
          </p>
        )}
      </div>

      {serverError && (
        <p className="form-alert" role="alert">
          {serverError}
        </p>
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? 'Registrando…' : 'Registrar leitura'}
      </button>
    </form>
  );
}
