import { WaterReadingMapper } from './water-reading.mapper';
import { WaterReadingEntity } from './water-reading.entity';
import { WaterReading } from '../../domain/water-reading';

describe('WaterReadingMapper', () => {
  const ts = new Date('2026-11-01T22:05:30.000Z');

  it('converte dominio -> ORM', () => {
    const domain = WaterReading.create({
      sensorId: 's1',
      unitId: 'u1',
      timestamp: ts,
      valueInLiters: 100,
      readingType: 'sensor',
    });
    const entity = WaterReadingMapper.toEntity(domain);
    expect(entity).toBeInstanceOf(WaterReadingEntity);
    expect(entity.unitId).toBe('u1');
    expect(entity.valueInLiters).toBe(100);
  });

  it('converte ORM -> dominio', () => {
    const entity = new WaterReadingEntity();
    entity.id = 'r1';
    entity.sensorId = 's1';
    entity.unitId = 'u1';
    entity.timestamp = ts;
    entity.valueInLiters = 42;
    entity.readingType = 'manual';

    const domain = WaterReadingMapper.toDomain(entity);
    expect(domain).toBeInstanceOf(WaterReading);
    expect(domain.readingType).toBe('manual');
    expect(domain.valueInLiters).toBe(42);
  });
});
