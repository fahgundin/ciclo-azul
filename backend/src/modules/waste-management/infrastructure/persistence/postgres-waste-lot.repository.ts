import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { WasteLot } from '../../domain/waste-lot';
import type { WasteLotRepository } from '../../domain/waste-lot.repository';
import { WasteLotEntity } from './waste-lot.entity';
import { WasteLotMapper } from './waste-lot.mapper';

/**
 * Adapter de saida (driven) Postgres do WasteLotRepository.
 * Usado quando a persistencia esta habilitada (DATABASE_URL presente).
 */
@Injectable()
export class PostgresWasteLotRepository implements WasteLotRepository {
  constructor(
    @InjectRepository(WasteLotEntity)
    private readonly repo: Repository<WasteLotEntity>,
  ) {}

  async save(lot: WasteLot): Promise<void> {
    await this.repo.save(WasteLotMapper.toEntity(lot));
  }

  async findAll(): Promise<WasteLot[]> {
    const rows = await this.repo.find({ order: { date: 'DESC' } });
    return rows.map((r) => WasteLotMapper.toDomain(r));
  }
}
