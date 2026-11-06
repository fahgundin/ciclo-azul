import { RegisterWaterReading } from './register-water-reading.use-case';
import type { WaterReadingRepository } from '../domain/water-reading.repository';
import type { WaterReading } from '../domain/water-reading';

/** Fake in-memory: demonstra que o caso de uso e testavel sem banco/broker. */
class InMemoryRepository implements WaterReadingRepository {
  public readings: WaterReading[] = [];
  async save(reading: WaterReading): Promise<void> {
    this.readings.push(reading);
  }
  async findLatestByUnit(unitId: string): Promise<WaterReading | null> {
    const list = this.readings.filter((r) => r.unitId === unitId);
    return list.at(-1) ?? null;
  }
  async findByUnit(unitId: string): Promise<WaterReading[]> {
    return this.readings.filter((r) => r.unitId === unitId);
  }
  async findLatestPerUnit(): Promise<WaterReading[]> {
    return [];
  }
}

describe('RegisterWaterReading (caso de uso)', () => {
  it('persiste uma leitura valida via repositorio', async () => {
    const repo = new InMemoryRepository();
    const useCase = new RegisterWaterReading(repo);

    await useCase.execute({
      sensorId: 'sensor-abc-123',
      unitId: 'data-center-sp-01',
      timestamp: new Date('2026-11-01T22:05:30.000Z'),
      valueInLiters: 1000,
      readingType: 'sensor',
    });

    expect(repo.readings).toHaveLength(1);
    expect(repo.readings[0].unitId).toBe('data-center-sp-01');
  });

  it('propaga erro de invariante do dominio (valor negativo)', async () => {
    const repo = new InMemoryRepository();
    const useCase = new RegisterWaterReading(repo);

    await expect(
      useCase.execute({
        sensorId: 'sensor-abc-123',
        unitId: 'data-center-sp-01',
        timestamp: new Date(),
        valueInLiters: -5,
        readingType: 'manual',
      }),
    ).rejects.toThrow('valueInLiters deve ser um numero nao negativo');
    expect(repo.readings).toHaveLength(0);
  });
});
