import { Module, type Provider } from '@nestjs/common';
import { ListWasteLots } from './application/list-waste-lots.use-case';
import { ListWasteTypes } from './application/list-waste-types.use-case';
import { RegisterWasteDisposal } from './application/register-waste-disposal.use-case';
import { RegisterWasteType } from './application/register-waste-type.use-case';
import { WASTE_LOT_REPOSITORY } from './domain/waste-lot.repository';
import { WASTE_TYPE_REPOSITORY } from './domain/waste-type.repository';
import { InMemoryWasteLotRepository } from './infrastructure/in-memory-waste-lot.repository';
import { InMemoryWasteTypeRepository } from './infrastructure/in-memory-waste-type.repository';
import { PostgresWasteLotRepository } from './infrastructure/persistence/postgres-waste-lot.repository';
import { PostgresWasteTypeRepository } from './infrastructure/persistence/postgres-waste-type.repository';
import { WasteLotController } from './infrastructure/waste-lot.controller';
import { WasteTypeController } from './infrastructure/waste-type.controller';
import { WasteTypeSeeder } from './infrastructure/waste-type.seeder';
import { DatabaseModule, isDatabaseEnabled } from '../../database/database.module';

/**
 * Modulo de gestao de residuos (R07 tipos; R06 lotes e destinacao; base para R08/R09).
 *
 * Os adapters de persistencia sao escolhidos por ambiente: Postgres quando
 * DATABASE_URL esta definido (F2), senao in-memory (dev rapido/testes/CI).
 * A troca nao afeta dominio nem casos de uso (regra hexagonal).
 *
 * WasteTypeSeeder popula dados de exemplo no boot (dev; idempotente; DB_SEED=false
 * desativa).
 */
const wasteTypeRepositoryProvider: Provider = isDatabaseEnabled()
  ? { provide: WASTE_TYPE_REPOSITORY, useClass: PostgresWasteTypeRepository }
  : { provide: WASTE_TYPE_REPOSITORY, useClass: InMemoryWasteTypeRepository };

const wasteLotRepositoryProvider: Provider = isDatabaseEnabled()
  ? { provide: WASTE_LOT_REPOSITORY, useClass: PostgresWasteLotRepository }
  : { provide: WASTE_LOT_REPOSITORY, useClass: InMemoryWasteLotRepository };

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [WasteTypeController, WasteLotController],
  providers: [
    RegisterWasteType,
    ListWasteTypes,
    RegisterWasteDisposal,
    ListWasteLots,
    wasteTypeRepositoryProvider,
    wasteLotRepositoryProvider,
    WasteTypeSeeder,
  ],
})
export class WasteManagementModule {}
