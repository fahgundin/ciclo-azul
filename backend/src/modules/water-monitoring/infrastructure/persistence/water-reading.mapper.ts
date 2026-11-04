import type { ReadingType } from '@ciclo-azul/contracts';
import { WaterReading } from '../../domain/water-reading';
import { WaterReadingEntity } from './water-reading.entity';

/** Mapper entre WaterReading (dominio) e WaterReadingEntity (ORM). */
export const WaterReadingMapper = {
  toDomain(entity: WaterReadingEntity): WaterReading {
    return WaterReading.create({
      sensorId: entity.sensorId,
      unitId: entity.unitId,
      timestamp: entity.timestamp,
      valueInLiters: entity.valueInLiters,
      readingType: entity.readingType as ReadingType,
    });
  },

  toEntity(domain: WaterReading): WaterReadingEntity {
    const entity = new WaterReadingEntity();
    entity.sensorId = domain.sensorId;
    entity.unitId = domain.unitId;
    entity.timestamp = domain.timestamp;
    entity.valueInLiters = domain.valueInLiters;
    entity.readingType = domain.readingType;
    return entity;
  },
};
