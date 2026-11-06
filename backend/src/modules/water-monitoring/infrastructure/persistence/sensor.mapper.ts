import { Sensor } from '../../domain/sensor';
import { SensorEntity } from './sensor.entity';

/** Mapper entre Sensor (dominio) e SensorEntity (ORM). */
export const SensorMapper = {
  toDomain(entity: SensorEntity): Sensor {
    return Sensor.link({
      sensorId: entity.sensorId,
      unitId: entity.unitId,
      linkedAt: entity.linkedAt,
    });
  },

  toEntity(domain: Sensor): SensorEntity {
    const entity = new SensorEntity();
    entity.sensorId = domain.sensorId;
    entity.unitId = domain.unitId;
    entity.status = domain.status;
    entity.linkedAt = domain.linkedAt;
    return entity;
  },
};
