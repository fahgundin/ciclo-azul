import { LinkSensor } from './link-sensor.use-case';
import { ListSensors } from './list-sensors.use-case';
import { ListWaterReadings } from './list-water-readings.use-case';
import { RegisterManualReading } from './register-manual-reading.use-case';
import { InvalidSensorIdError, Sensor, SensorAlreadyLinkedError } from '../domain/sensor';
import type { SensorRepository } from '../domain/sensor.repository';
import type { WaterReadingRepository } from '../domain/water-reading.repository';
import { WaterReading } from '../domain/water-reading';
import {
  ManualReadingDateError,
  ManualReadingValueError,
  UnitHasSensorError,
} from '../domain/manual-reading';

class FakeSensorRepository implements SensorRepository {
  items: Sensor[] = [];
  async save(sensor: Sensor): Promise<void> {
    this.items.push(sensor);
  }
  async findById(sensorId: string): Promise<Sensor | null> {
    return this.items.find((s) => s.sensorId === sensorId) ?? null;
  }
  async findByUnit(unitId: string): Promise<Sensor[]> {
    return this.items.filter((s) => s.unitId === unitId);
  }
  async findAll(): Promise<Sensor[]> {
    return [...this.items];
  }
}

class FakeReadingRepository implements WaterReadingRepository {
  items: WaterReading[] = [];
  async save(reading: WaterReading): Promise<void> {
    this.items.push(reading);
  }
  async findLatestByUnit(unitId: string): Promise<WaterReading | null> {
    return this.items.filter((r) => r.unitId === unitId).at(-1) ?? null;
  }
  async findByUnit(unitId: string): Promise<WaterReading[]> {
    return this.items
      .filter((r) => r.unitId === unitId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}

const NOW = new Date('2026-11-05T15:00:00.000Z');

describe('LinkSensor / ListSensors', () => {
  it('vincula um sensor a uma unidade e o lista como conectado', async () => {
    const sensors = new FakeSensorRepository();
    const created = await new LinkSensor(sensors).execute(
      { sensorId: 'sensor-abc-123', unitId: 'data-center-sp-01' },
      NOW,
    );

    expect(created.status).toBe('connected');
    expect(created.linkedAt).toEqual(NOW);
    const all = await new ListSensors(sensors).execute();
    expect(all).toHaveLength(1);
    expect(all[0].unitId).toBe('data-center-sp-01');
  });

  it('nao vincula o mesmo sensor duas vezes', async () => {
    const sensors = new FakeSensorRepository();
    const useCase = new LinkSensor(sensors);
    await useCase.execute({ sensorId: 'sensor-abc-123', unitId: 'u1' });

    await expect(useCase.execute({ sensorId: 'sensor-abc-123', unitId: 'u2' })).rejects.toThrow(
      SensorAlreadyLinkedError,
    );
    expect(sensors.items).toHaveLength(1);
  });

  it('rejeita identificador invalido sem persistir', async () => {
    const sensors = new FakeSensorRepository();
    await expect(
      new LinkSensor(sensors).execute({ sensorId: 'x', unitId: 'u1' }),
    ).rejects.toThrow(InvalidSensorIdError);
    expect(sensors.items).toHaveLength(0);
  });
});

describe('RegisterManualReading / ListWaterReadings', () => {
  function build() {
    const sensors = new FakeSensorRepository();
    const readings = new FakeReadingRepository();
    return {
      sensors,
      readings,
      register: new RegisterManualReading(sensors, readings),
      list: new ListWaterReadings(readings),
    };
  }

  it('registra leitura manual em unidade sem sensor e a deixa no historico', async () => {
    const { register, list } = build();
    const reading = await register.execute(
      { unitId: 'data-center-rj-02', valueInLiters: 1500, date: '2026-11-04' },
      NOW,
    );

    expect(reading.readingType).toBe('manual');
    expect(reading.sensorId).toBe('manual');
    const history = await list.execute('data-center-rj-02');
    expect(history).toHaveLength(1);
    expect(history[0].valueInLiters).toBe(1500);
    expect(history[0].timestamp.toISOString()).toBe('2026-11-04T00:00:00.000Z');
  });

  it('bloqueia leitura manual quando a unidade tem sensor conectado', async () => {
    const { register, sensors, readings } = build();
    await new LinkSensor(sensors).execute({ sensorId: 'sensor-abc-123', unitId: 'u1' });

    await expect(
      register.execute({ unitId: 'u1', valueInLiters: 100, date: '2026-11-05' }, NOW),
    ).rejects.toThrow(UnitHasSensorError);
    expect(readings.items).toHaveLength(0);
  });

  it('permite leitura manual em outra unidade mesmo havendo sensor em uma unidade', async () => {
    const { register, sensors } = build();
    await new LinkSensor(sensors).execute({ sensorId: 'sensor-abc-123', unitId: 'u1' });

    await expect(
      register.execute({ unitId: 'u2', valueInLiters: 100, date: '2026-11-05' }, NOW),
    ).resolves.toBeDefined();
  });

  it.each([
    ['volume zero', { unitId: 'u1', valueInLiters: 0, date: '2026-11-05' }, ManualReadingValueError],
    ['volume negativo', { unitId: 'u1', valueInLiters: -5, date: '2026-11-05' }, ManualReadingValueError],
    ['data futura', { unitId: 'u1', valueInLiters: 10, date: '2026-11-06' }, ManualReadingDateError],
    ['data com mais de 28 dias', { unitId: 'u1', valueInLiters: 10, date: '2026-10-07' }, ManualReadingDateError],
  ])('rejeita leitura invalida sem persistir: %s', async (_label, input, errorType) => {
    const { register, readings } = build();
    await expect(register.execute(input, NOW)).rejects.toThrow(errorType);
    expect(readings.items).toHaveLength(0);
  });

  it('lista o historico da mais recente para a mais antiga', async () => {
    const { register, list } = build();
    await register.execute({ unitId: 'u1', valueInLiters: 10, date: '2026-11-01' }, NOW);
    await register.execute({ unitId: 'u1', valueInLiters: 20, date: '2026-11-04' }, NOW);
    await register.execute({ unitId: 'u1', valueInLiters: 30, date: '2026-11-02' }, NOW);

    const history = await list.execute('u1');
    expect(history.map((r) => r.valueInLiters)).toEqual([20, 30, 10]);
  });

  it('exige a unidade para consultar o historico', async () => {
    const { list } = build();
    await expect(list.execute('')).rejects.toThrow('A unidade é obrigatória');
  });
});
