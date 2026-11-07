import { useId, useState, type FormEvent } from 'react';
import { waterConsumptionTopic, type SensorView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { SensorApi } from '../../core/api/sensor-api';
import { validateLinkSensor, type FieldErrors } from '../../core/sensors/validation';
import { Icon } from '../components/Icon';

interface LinkSensorFormProps {
  api: SensorApi;
  /** Unidades ja conhecidas (sugestoes do campo de unidade). */
  units: readonly string[];
  /** Chamado apos vincular com sucesso (a tela recarrega a lista e avisa). */
  onLinked: (sensor: SensorView) => void;
  onClose: () => void;
}

/**
 * Formulario de vinculo de sensor a uma unidade (R04). Depois de vincular, mostra
 * em que topico MQTT o sensor deve publicar (contrato em docs/contrato-iot.md).
 */
export function LinkSensorForm({
  api,
  units,
  onLinked,
  onClose,
}: LinkSensorFormProps): JSX.Element {
  const idPrefix = useId();
  const [sensorId, setSensorId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'sensorId' | 'unitId'>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linked, setLinked] = useState<SensorView | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setServerError(null);
    const found = validateLinkSensor({ sensorId, unitId });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSubmitting(true);
    try {
      const sensor = await api.link({ sensorId: sensorId.trim(), unitId: unitId.trim() });
      setLinked(sensor);
      onLinked(sensor);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Falha ao vincular o sensor');
    } finally {
      setSubmitting(false);
    }
  }

  if (linked) {
    return (
      <div className="form">
        <p className="muted">
          <strong>Sensor {linked.sensorId} vinculado</strong> à unidade {linked.unitId}. Para enviar
          leituras, publique no tópico MQTT abaixo (payload em <code>docs/contrato-iot.md</code>):
        </p>
        <pre className="code">{waterConsumptionTopic(linked.unitId)}</pre>
        <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
          Concluir
        </button>
      </div>
    );
  }

  const sensorIdField = `${idPrefix}-sensor`;
  const unitField = `${idPrefix}-unit`;
  const unitList = `${idPrefix}-units`;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate aria-label="Conectar sensor">
      <div className="field">
        <label htmlFor={sensorIdField}>Identificador do sensor</label>
        <input
          id={sensorIdField}
          className="field__input"
          value={sensorId}
          onChange={(e) => setSensorId(e.target.value)}
          placeholder="Ex.: hidrometro-torre-a"
          autoComplete="off"
          aria-invalid={errors.sensorId ? true : undefined}
          aria-describedby={errors.sensorId ? `${sensorIdField}-error` : undefined}
        />
        {errors.sensorId && (
          <p className="field__error" id={`${sensorIdField}-error`}>
            <Icon name="alert" size={16} />
            {errors.sensorId}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={unitField}>Unidade</label>
        <input
          id={unitField}
          className="field__input"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          list={unitList}
          placeholder="Ex.: data-center-sp-01"
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

      {serverError && (
        <p className="form-alert" role="alert">
          {serverError}
        </p>
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? 'Conectando…' : 'Conectar'}
      </button>
    </form>
  );
}
