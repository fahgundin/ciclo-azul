import { Injectable } from '@nestjs/common';
import type { Sensor } from '../domain/sensor';
import type { SensorRepository } from '../domain/sensor.repository';

/**
 * Adapter de saida (driven) em memoria do SensorRepository.
 * Fallback quando DATABASE_URL nao esta definido (dev rapido/testes/CI).
 */
@Injectable()
export class InMemorySensorRepository implements SensorRepository {
  private readonly sensors = new Map<string, Sensor>();

  async save(sensor: Sensor): Promise<void> {
    this.sensors.set(sensor.sensorId, sensor);
  }

  async findById(sensorId: string): Promise<Sensor | null> {
    return this.sensors.get(sensorId) ?? null;
  }

  async findByUnit(unitId: string): Promise<Sensor[]> {
    return [...this.sensors.values()].filter((s) => s.unitId === unitId);
  }

  async findAll(): Promise<Sensor[]> {
    return [...this.sensors.values()].sort((a, b) => a.linkedAt.getTime() - b.linkedAt.getTime());
  }
}
