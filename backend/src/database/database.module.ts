import { Module, type DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasteTypeEntity } from '../modules/waste-management/infrastructure/persistence/waste-type.entity';
import { WasteLotEntity } from '../modules/waste-management/infrastructure/persistence/waste-lot.entity';
import { WaterReadingEntity } from '../modules/water-monitoring/infrastructure/persistence/water-reading.entity';
import { SensorEntity } from '../modules/water-monitoring/infrastructure/persistence/sensor.entity';

/** Todas as entidades ORM registradas na conexao. */
const ENTITIES = [WasteTypeEntity, WasteLotEntity, WaterReadingEntity, SensorEntity];

/**
 * Indica se a persistencia Postgres esta configurada (via env).
 * Sem DATABASE_URL, o backend usa repositorios in-memory (dev rapido/testes/CI).
 */
export function isDatabaseEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Modulo de banco de dados. Quando DATABASE_URL esta presente, conecta ao
 * PostgreSQL (provisionado pela F2) via TypeORM. Caso contrario, nao registra
 * nada e os modulos caem no adapter in-memory.
 *
 * `synchronize` e habilitado apenas fora de producao (dev). Em producao, usar
 * migrations (pendencia registrada na issue de persistencia).
 */
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    if (!isDatabaseEnabled()) {
      return { module: DatabaseModule };
    }
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL,
          entities: ENTITIES,
          synchronize: process.env.NODE_ENV !== 'production',
        }),
      ],
    };
  }

  /** Registra os repositorios ORM das entidades para injecao nos modulos. */
  static forFeature(): DynamicModule {
    if (!isDatabaseEnabled()) {
      return { module: DatabaseModule };
    }
    return {
      module: DatabaseModule,
      imports: [TypeOrmModule.forFeature(ENTITIES)],
      exports: [TypeOrmModule],
    };
  }
}
