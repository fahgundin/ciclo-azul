import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Sensor } from '../../domain/sensor';
import type { SensorRepository } from '../../domain/sensor.repository';
import { SensorEntity } from './sensor.entity';
import { SensorMapper } from './sensor.mapper';

/**
 * Adapter de saida (driven) Postgres do SensorRepository.
 * Usado quando a persistencia esta habilitada (DATABASE_URL presente).
 */
@Injectable()
export class PostgresSensorRepository implements SensorRepository {
  constructor(
    @InjectRepository(SensorEntity)
    private readonly repo: Repository<SensorEntity>,
  ) {}

  async save(sensor: Sensor): Promise<void> {
    await this.repo.save(SensorMapper.toEntity(sensor));
  }

  async findById(sensorId: string): Promise<Sensor | null> {
    const row = await this.repo.findOne({ where: { sensorId } });
    return row ? SensorMapper.toDomain(row) : null;
  }

  async findByUnit(unitId: string): Promise<Sensor[]> {
    const rows = await this.repo.find({ where: { unitId } });
    return rows.map((r) => SensorMapper.toDomain(r));
  }

  async findAll(): Promise<Sensor[]> {
    const rows = await this.repo.find({ order: { linkedAt: 'ASC' } });
    return rows.map((r) => SensorMapper.toDomain(r));
  }
}
