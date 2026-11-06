import { Sensor } from '../../domain/sensor';
import { SensorEntity } from './sensor.entity';
import { SensorMapper } from './sensor.mapper';

describe('SensorMapper', () => {
  const linkedAt = new Date('2026-11-05T12:00:00.000Z');

  it('converte dominio -> ORM', () => {
    const entity = SensorMapper.toEntity(
      Sensor.link({ sensorId: 'sensor-abc-123', unitId: 'u1', linkedAt }),
    );
    expect(entity).toBeInstanceOf(SensorEntity);
    expect(entity).toEqual({
      sensorId: 'sensor-abc-123',
      unitId: 'u1',
      status: 'connected',
      linkedAt,
    });
  });

  it('converte ORM -> dominio', () => {
    const entity = new SensorEntity();
    entity.sensorId = 'sensor-abc-123';
    entity.unitId = 'u1';
    entity.status = 'connected';
    entity.linkedAt = linkedAt;

    const sensor = SensorMapper.toDomain(entity);
    expect(sensor).toBeInstanceOf(Sensor);
    expect(sensor.status).toBe('connected');
    expect(sensor.linkedAt).toBe(linkedAt);
  });
});
