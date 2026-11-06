import { GetUnitConsumptionStatus } from './get-unit-consumption-status.use-case';
import { ListUnitsConsumptionStatus } from './list-units-consumption-status.use-case';
import { LinkSensor } from './link-sensor.use-case';
import { RegisterWaterReading } from './register-water-reading.use-case';
import { UnitRequiredError } from '../domain/sensor';
import { InMemorySensorRepository } from '../infrastructure/in-memory-sensor.repository';
import { InMemoryWaterReadingRepository } from '../infrastructure/in-memory-water-reading.repository';

// "Agora" fixo: 5 de novembro de 2026, 15:00:00 UTC.
const NOW = new Date('2026-11-05T15:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

function build() {
  const readings = new InMemoryWaterReadingRepository();
  const sensors = new InMemorySensorRepository();
  const ingest = new RegisterWaterReading(readings);
  return {
    ingest,
    link: new LinkSensor(sensors),
    get: new GetUnitConsumptionStatus(readings),
    list: new ListUnitsConsumptionStatus(readings, sensors),
  };
}

/** Simula uma leitura chegando do sensor (o mesmo caso de uso que a ingestao MQTT chama). */
function sensorReading(unitId: string, timestamp: Date, valueInLiters: number) {
  return { sensorId: 'sensor-abc-123', unitId, timestamp, valueInLiters, readingType: 'sensor' as const };
}

describe('GetUnitConsumptionStatus', () => {
  // Cenario: Exibir consumo atualizado de uma unidade
  it('mostra o consumo atual e o atualiza conforme novas leituras chegam', async () => {
    const { ingest, get } = build();

    await ingest.execute(sensorReading('data-center-sp-01', minutesAgo(2), 1000));
    expect(await get.execute('data-center-sp-01', NOW)).toMatchObject({
      state: 'live',
      currentValueInLiters: 1000,
    });

    await ingest.execute(sensorReading('data-center-sp-01', minutesAgo(1), 1100));
    expect(await get.execute('data-center-sp-01', NOW)).toMatchObject({
      state: 'live',
      currentValueInLiters: 1100,
    });
  });

  // Cenario: Indicar unidade sem leitura recente
  it('sinaliza a unidade sem leitura ha mais de 15 minutos como stale', async () => {
    const { ingest, get } = build();
    await ingest.execute(sensorReading('data-center-rj-02', minutesAgo(20), 900));

    const status = await get.execute('data-center-rj-02', NOW);
    expect(status.state).toBe('stale');
    expect(status.currentValueInLiters).toBe(900);
  });

  it('o consumo atual segue o timestamp, nao a ordem de chegada', async () => {
    const { ingest, get } = build();
    await ingest.execute(sensorReading('u1', minutesAgo(1), 500));
    await ingest.execute(sensorReading('u1', minutesAgo(30), 100)); // chegou depois, mas e antiga

    expect(await get.execute('u1', NOW)).toMatchObject({ state: 'live', currentValueInLiters: 500 });
  });

  it('unidade sem leitura devolve no-data', async () => {
    expect(await build().get.execute('data-center-nova', NOW)).toMatchObject({
      unitId: 'data-center-nova',
      state: 'no-data',
      currentValueInLiters: null,
    });
  });

  it('exige a unidade', async () => {
    await expect(build().get.execute('  ', NOW)).rejects.toThrow(UnitRequiredError);
  });
});

describe('ListUnitsConsumptionStatus', () => {
  it('lista o estado de cada unidade, ordenado por unitId', async () => {
    const { ingest, list } = build();
    await ingest.execute(sensorReading('data-center-rj-02', minutesAgo(40), 900));
    await ingest.execute(sensorReading('data-center-sp-01', minutesAgo(1), 1200));

    const all = await list.execute(NOW);
    expect(all.map((s) => [s.unitId, s.state])).toEqual([
      ['data-center-rj-02', 'stale'],
      ['data-center-sp-01', 'live'],
    ]);
  });

  it('inclui unidade com sensor vinculado que ainda nao enviou leitura (no-data)', async () => {
    const { link, list } = build();
    await link.execute({ sensorId: 'sensor-abc-123', unitId: 'data-center-rs-05' });

    expect(await list.execute(NOW)).toEqual([
      expect.objectContaining({ unitId: 'data-center-rs-05', state: 'no-data' }),
    ]);
  });

  it('nao duplica a unidade que tem sensor e leituras', async () => {
    const { ingest, link, list } = build();
    await link.execute({ sensorId: 'sensor-abc-123', unitId: 'u1' });
    await ingest.execute(sensorReading('u1', minutesAgo(1), 10));
    await ingest.execute(sensorReading('u1', minutesAgo(2), 9));

    const all = await list.execute(NOW);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ unitId: 'u1', state: 'live', currentValueInLiters: 10 });
  });

  it('sem unidades conhecidas devolve lista vazia', async () => {
    expect(await build().list.execute(NOW)).toEqual([]);
  });
});
