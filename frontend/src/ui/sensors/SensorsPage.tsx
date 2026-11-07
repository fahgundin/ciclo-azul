import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SensorView } from '@ciclo-azul/contracts';
import { ApiError } from '../../core/api/api-error';
import type { SensorApi } from '../../core/api/sensor-api';
import type { WaterReadingApi } from '../../core/api/water-reading-api';
import { formatDateTime } from '../../core/format';
import { Dialog } from '../components/Dialog';
import { useFlash } from '../components/Flash';
import { Icon } from '../components/Icon';
import { LinkSensorForm } from './LinkSensorForm';
import { ManualReadingForm } from './ManualReadingForm';
import { ManualReadingHistory } from './ManualReadingHistory';
import '../styles/waste-types.css';
import '../styles/components.css';

interface SensorsPageProps {
  sensorApi: SensorApi;
  readingApi: WaterReadingApi;
  /** Relogio injetavel (testes). */
  now?: () => Date;
}

type OpenDialog = 'link' | 'manual' | null;

/** Agrupa os sensores por unidade, com as unidades em ordem alfabetica. */
function groupByUnit(sensors: readonly SensorView[]): [string, SensorView[]][] {
  const groups = new Map<string, SensorView[]>();
  for (const sensor of sensors) {
    groups.set(sensor.unitId, [...(groups.get(sensor.unitId) ?? []), sensor]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Tela de sensores IoT e leitura manual (R04), sobre a API real do backend.
 *
 * Nao ha cadastro de unidades: as unidades conhecidas vem dos sensores ja
 * vinculados (ver docs/migracao-frontend.md, "Lacunas do R04").
 */
export function SensorsPage({ sensorApi, readingApi, now }: SensorsPageProps): JSX.Element {
  const flash = useFlash();
  const [sensors, setSensors] = useState<SensorView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [historyUnit, setHistoryUnit] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  // Unidades onde ja se lancou leitura manual nesta sessao (nao ha cadastro de unidades).
  const [manualUnits, setManualUnits] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      setSensors(await sensorApi.list());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar os sensores');
    } finally {
      setLoading(false);
    }
  }, [sensorApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupByUnit(sensors), [sensors]);
  const units = useMemo(() => groups.map(([unit]) => unit), [groups]);
  const knownUnits = useMemo(() => [...new Set([...units, ...manualUnits])], [units, manualUnits]);

  return (
    <section className="page">
      <h1>Sensores IoT</h1>

      <p className="muted">
        {sensors.length === 1 ? '1 sensor conectado.' : `${sensors.length} sensores conectados.`}
      </p>

      <div className="actions">
        <button type="button" className="btn btn--primary" onClick={() => setDialog('link')}>
          <Icon name="plus" />
          Conectar sensor
        </button>
        <button type="button" className="btn" onClick={() => setDialog('manual')}>
          <Icon name="plus" />
          Registrar leitura manual (sem sensor)
        </button>
      </div>

      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="hint">Carregando…</p>
      ) : groups.length === 0 ? (
        !error && <p className="list-empty">Nenhum sensor conectado ainda.</p>
      ) : (
        groups.map(([unitId, unitSensors]) => (
          <section className="page__section" key={unitId} aria-label={`Unidade ${unitId}`}>
            <h2>{unitId}</h2>
            <ul className="glass list">
              {unitSensors.map((sensor) => (
                <li key={sensor.sensorId}>
                  <div className="item__title">{sensor.sensorId}</div>
                  <div className="item__meta">Vinculado em {formatDateTime(sensor.linkedAt)}</div>
                  <span className="tag">
                    <Icon name="check" size={14} />
                    Conectado
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <ManualReadingHistory
        api={readingApi}
        unitId={historyUnit}
        units={knownUnits}
        onSelectUnit={setHistoryUnit}
        version={historyVersion}
      />

      <Dialog open={dialog === 'link'} title="Conectar sensor" onClose={() => setDialog(null)}>
        <LinkSensorForm
          api={sensorApi}
          units={units}
          onLinked={(sensor) => {
            flash(`Sensor ${sensor.sensorId} conectado.`);
            void load();
          }}
          onClose={() => setDialog(null)}
        />
      </Dialog>

      <Dialog
        open={dialog === 'manual'}
        title="Registrar leitura manual"
        onClose={() => setDialog(null)}
      >
        <ManualReadingForm
          api={readingApi}
          units={manualUnits}
          connectedUnits={units}
          now={now}
          onRegistered={(unitId) => {
            flash('Leitura manual registrada.');
            setManualUnits((current) =>
              current.includes(unitId) ? current : [...current, unitId],
            );
            setHistoryUnit(unitId);
            setHistoryVersion((version) => version + 1);
          }}
          onClose={() => setDialog(null)}
        />
      </Dialog>
    </section>
  );
}
