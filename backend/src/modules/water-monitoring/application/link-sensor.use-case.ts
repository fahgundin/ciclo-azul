import { Inject, Injectable } from '@nestjs/common';
import { Sensor, SensorAlreadyLinkedError } from '../domain/sensor';
import { SENSOR_REPOSITORY, type SensorRepository } from '../domain/sensor.repository';

/**
 * Caso de uso: vincular um sensor IoT a uma unidade (R04).
 * O sensor vinculado fica "Conectado" e passa a ter as leituras ingeridas por MQTT.
 */
@Injectable()
export class LinkSensor {
  constructor(
    @Inject(SENSOR_REPOSITORY)
    private readonly sensors: SensorRepository,
  ) {}

  async execute(input: { sensorId: string; unitId: string }, now: Date = new Date()): Promise<Sensor> {
    const sensor = Sensor.link({ sensorId: input.sensorId, unitId: input.unitId, linkedAt: now });
    if (await this.sensors.findById(sensor.sensorId)) {
      throw new SensorAlreadyLinkedError(sensor.sensorId);
    }
    await this.sensors.save(sensor);
    return sensor;
  }
}
