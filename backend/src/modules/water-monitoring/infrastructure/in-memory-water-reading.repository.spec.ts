import { WaterReading } from '../domain/water-reading';
import { InMemoryWaterReadingRepository } from './in-memory-water-reading.repository';

function reading(unitId: string, isoTimestamp: string, valueInLiters: number): WaterReading {
  return WaterReading.create({
    sensorId: 'sensor-abc-123',
    unitId,
    timestamp: new Date(isoTimestamp),
    valueInLiters,
    readingType: 'sensor',
  });
}

describe('InMemoryWaterReadingRepository', () => {
  describe('findLatestByUnit', () => {
    it('retorna null quando a unidade nao tem leitura', async () => {
      expect(await new InMemoryWaterReadingRepository().findLatestByUnit('u1')).toBeNull();
    });

    // Reproduz o bug: antes devolvia a ULTIMA INSERIDA, nao a de maior timestamp.
    it('devolve a de maior timestamp, mesmo se uma mais antiga foi inserida depois', async () => {
      const repo = new InMemoryWaterReadingRepository();
      await repo.save(reading('u1', '2026-11-05T14:55:00.000Z', 300));
      await repo.save(reading('u1', '2026-11-01T00:00:00.000Z', 100)); // retroativa, inserida depois

      const latest = await repo.findLatestByUnit('u1');
      expect(latest?.valueInLiters).toBe(300);
    });

    it('considera so a unidade pedida', async () => {
      const repo = new InMemoryWaterReadingRepository();
      await repo.save(reading('u1', '2026-11-05T14:00:00.000Z', 1));
      await repo.save(reading('u2', '2026-11-05T14:30:00.000Z', 2));

      expect((await repo.findLatestByUnit('u1'))?.valueInLiters).toBe(1);
    });

    it('em empate de timestamp, vence a inserida por ultimo', async () => {
      const repo = new InMemoryWaterReadingRepository();
      await repo.save(reading('u1', '2026-11-05T14:00:00.000Z', 1));
      await repo.save(reading('u1', '2026-11-05T14:00:00.000Z', 2));

      expect((await repo.findLatestByUnit('u1'))?.valueInLiters).toBe(2);
    });
  });

  describe('findLatestPerUnit', () => {
    it('retorna lista vazia sem leituras', async () => {
      expect(await new InMemoryWaterReadingRepository().findLatestPerUnit()).toEqual([]);
    });

    it('retorna uma leitura por unidade: a de maior timestamp', async () => {
      const repo = new InMemoryWaterReadingRepository();
      await repo.save(reading('u1', '2026-11-05T14:00:00.000Z', 10));
      await repo.save(reading('u1', '2026-11-05T14:10:00.000Z', 11));
      await repo.save(reading('u2', '2026-11-05T13:00:00.000Z', 20));
      await repo.save(reading('u1', '2026-11-04T09:00:00.000Z', 99)); // retroativa

      const latest = await repo.findLatestPerUnit();
      const byUnit = Object.fromEntries(latest.map((r) => [r.unitId, r.valueInLiters]));
      expect(latest).toHaveLength(2);
      expect(byUnit).toEqual({ u1: 11, u2: 20 });
    });
  });
});
