import type { Sensor } from './sensor';

/**
 * Port de saida (driven): persistencia de sensores vinculados.
 * Implementado por adapters em infrastructure/ (in-memory e Postgres).
 */
export interface SensorRepository {
  save(sensor: Sensor): Promise<void>;
  findById(sensorId: string): Promise<Sensor | null>;
  findByUnit(unitId: string): Promise<Sensor[]>;
  findAll(): Promise<Sensor[]>;
}

/** Token de injecao para o port. */
export const SENSOR_REPOSITORY = Symbol('SensorRepository');
