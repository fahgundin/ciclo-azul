import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { WasteTypeRepository } from '../../domain/waste-type.repository';
import type { WasteType } from '../../domain/waste-type';
import { WasteTypeEntity } from './waste-type.entity';
import { WasteTypeMapper } from './waste-type.mapper';

/**
 * Adapter de saida (driven) Postgres do WasteTypeRepository.
 * Usado quando a persistencia esta habilitada (DATABASE_URL presente).
 */
@Injectable()
export class PostgresWasteTypeRepository implements WasteTypeRepository {
  constructor(
    @InjectRepository(WasteTypeEntity)
    private readonly repo: Repository<WasteTypeEntity>,
  ) {}

  async save(wasteType: WasteType): Promise<void> {
    await this.repo.save(WasteTypeMapper.toEntity(wasteType));
  }

  async findAll(): Promise<WasteType[]> {
    const rows = await this.repo.find();
    return rows.map((r) => WasteTypeMapper.toDomain(r));
  }
}
