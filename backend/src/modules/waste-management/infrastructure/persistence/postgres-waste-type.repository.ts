import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { WasteTypeRepository } from '../../domain/waste-type.repository';
import type { WasteType } from '../../domain/waste-type';
import { WasteTypeEntity } from './waste-type.entity';
import { WasteTypeMapper } from './waste-type.mapper';

/** Formato de UUID aceito pela coluna `id` (qualquer versao). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  async findById(id: string): Promise<WasteType | null> {
    // A coluna e uuid: um id malformado faria o Postgres lancar erro (500) em vez
    // de "nao encontrado".
    if (!UUID_PATTERN.test(id)) {
      return null;
    }
    const row = await this.repo.findOne({ where: { id } });
    return row ? WasteTypeMapper.toDomain(row) : null;
  }
}
