import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { WaterReadingRepository } from '../../domain/water-reading.repository';
import type { WaterReading } from '../../domain/water-reading';
import { WaterReadingEntity } from './water-reading.entity';
import { WaterReadingMapper } from './water-reading.mapper';

/**
 * Adapter de saida (driven) Postgres do WaterReadingRepository.
 * Usado quando a persistencia esta habilitada (DATABASE_URL presente).
 */
@Injectable()
export class PostgresWaterReadingRepository implements WaterReadingRepository {
  constructor(
    @InjectRepository(WaterReadingEntity)
    private readonly repo: Repository<WaterReadingEntity>,
  ) {}

  async save(reading: WaterReading): Promise<void> {
    await this.repo.save(WaterReadingMapper.toEntity(reading));
  }

  async findLatestByUnit(unitId: string): Promise<WaterReading | null> {
    const row = await this.repo.findOne({
      where: { unitId },
      order: { timestamp: 'DESC' },
    });
    return row ? WaterReadingMapper.toDomain(row) : null;
  }

  async findByUnit(unitId: string): Promise<WaterReading[]> {
    const rows = await this.repo.find({
      where: { unitId },
      order: { timestamp: 'DESC' },
    });
    return rows.map((r) => WaterReadingMapper.toDomain(r));
  }
}
