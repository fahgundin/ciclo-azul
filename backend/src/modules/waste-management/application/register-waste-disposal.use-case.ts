import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WasteLot, WasteTypeNotFoundError } from '../domain/waste-lot';
import { WASTE_LOT_REPOSITORY, type WasteLotRepository } from '../domain/waste-lot.repository';
import {
  WASTE_TYPE_REPOSITORY,
  type WasteTypeRepository,
} from '../domain/waste-type.repository';

/**
 * Caso de uso: registrar a destinacao de um lote de residuo (R06).
 *
 * O lote nasce "Destinado". Valida os campos obrigatorios (incluindo o comprovante)
 * pela entidade de dominio e exige que o tipo de residuo ja exista (R07).
 */
@Injectable()
export class RegisterWasteDisposal {
  constructor(
    @Inject(WASTE_TYPE_REPOSITORY)
    private readonly wasteTypes: WasteTypeRepository,
    @Inject(WASTE_LOT_REPOSITORY)
    private readonly lots: WasteLotRepository,
  ) {}

  async execute(
    input: {
      wasteTypeId: unknown;
      location: unknown;
      receiverCompany: unknown;
      license: unknown;
      date: unknown;
      quantity: unknown;
      proofReference: unknown;
    },
    now: Date = new Date(),
  ): Promise<WasteLot> {
    // Valida os campos primeiro (sem I/O); so depois consulta o tipo.
    const lot = WasteLot.registerDisposal({ id: randomUUID(), ...input }, now);

    if (!(await this.wasteTypes.findById(lot.wasteTypeId))) {
      throw new WasteTypeNotFoundError();
    }

    await this.lots.save(lot);
    return lot;
  }
}
