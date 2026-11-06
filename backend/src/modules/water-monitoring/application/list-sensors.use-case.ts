import { Inject, Injectable } from '@nestjs/common';
import type { Sensor } from '../domain/sensor';
import { SENSOR_REPOSITORY, type SensorRepository } from '../domain/sensor.repository';

/** Caso de uso: listar os sensores vinculados (R04). */
@Injectable()
export class ListSensors {
  constructor(
    @Inject(SENSOR_REPOSITORY)
    private readonly sensors: SensorRepository,
  ) {}

  execute(): Promise<Sensor[]> {
    return this.sensors.findAll();
  }
}
