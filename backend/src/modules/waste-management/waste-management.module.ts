import { Module, type Provider } from '@nestjs/common';
import { RegisterWasteType } from './application/register-waste-type.use-case';
import { ListWasteTypes } from './application/list-waste-types.use-case';
import { WASTE_TYPE_REPOSITORY } from './domain/waste-type.repository';
import { InMemoryWasteTypeRepository } from './infrastructure/in-memory-waste-type.repository';
import { PostgresWasteTypeRepository } from './infrastructure/persistence/postgres-waste-type.repository';
import { WasteTypeController } from './infrastructure/waste-type.controller';
import { DatabaseModule, isDatabaseEnabled } from '../../database/database.module';

/**
 * Modulo de gestao de residuos (R07; base para R06/R08/R09).
 *
 * O adapter de persistencia e escolhido por ambiente: Postgres quando
 * DATABASE_URL esta definido (F2), senao in-memory (dev rapido/testes/CI).
 * A troca nao afeta dominio nem casos de uso (regra hexagonal).
 */
const repositoryProvider: Provider = isDatabaseEnabled()
  ? { provide: WASTE_TYPE_REPOSITORY, useClass: PostgresWasteTypeRepository }
  : { provide: WASTE_TYPE_REPOSITORY, useClass: InMemoryWasteTypeRepository };

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [WasteTypeController],
  providers: [RegisterWasteType, ListWasteTypes, repositoryProvider],
})
export class WasteManagementModule {}
