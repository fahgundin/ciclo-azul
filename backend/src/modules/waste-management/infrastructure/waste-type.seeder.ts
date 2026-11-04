import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { RegisterWasteType } from '../application/register-waste-type.use-case';
import { ListWasteTypes } from '../application/list-waste-types.use-case';

/** Tipos de residuo de exemplo para o ambiente de desenvolvimento. */
const SEED_WASTE_TYPES: ReadonlyArray<{ name: string; classification: string }> = [
  { name: 'Óleo de refrigeração', classification: 'Metal pesado' },
  { name: 'Solução de limpeza química', classification: 'Químico corrosivo' },
  { name: 'Baterias de nobreak', classification: 'Metal pesado' },
  { name: 'Água de purga de torre', classification: 'Efluente industrial' },
];

/**
 * Popula tipos de residuo de exemplo no boot (apenas DEV).
 *
 * - Idempotente: so insere se ainda nao houver tipos cadastrados.
 * - Desativavel por env (DB_SEED=false).
 * - Usa os casos de uso (respeita a arquitetura; nao fala direto com o banco).
 */
@Injectable()
export class WasteTypeSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(WasteTypeSeeder.name);

  constructor(
    private readonly registerWasteType: RegisterWasteType,
    private readonly listWasteTypes: ListWasteTypes,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.DB_SEED === 'false') {
      return;
    }
    await this.seed();
  }

  /** Executa o seed de forma idempotente. Retorna quantos tipos inseriu. */
  async seed(): Promise<number> {
    const existing = await this.listWasteTypes.execute();
    if (existing.length > 0) {
      return 0;
    }
    for (const item of SEED_WASTE_TYPES) {
      await this.registerWasteType.execute(item);
    }
    this.logger.log(`Seed: ${SEED_WASTE_TYPES.length} tipos de residuo cadastrados`);
    return SEED_WASTE_TYPES.length;
  }
}
