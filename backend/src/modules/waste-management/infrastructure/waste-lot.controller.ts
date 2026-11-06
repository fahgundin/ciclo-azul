import { Body, Controller, Get, Post } from '@nestjs/common';
import type { RegisterDisposalInput, WasteLotView } from '@ciclo-azul/contracts';
import { Roles } from '../../../auth/roles.decorator';
import { APP_ROLES } from '../../../auth/roles';
import { ListWasteLots } from '../application/list-waste-lots.use-case';
import { RegisterWasteDisposal } from '../application/register-waste-disposal.use-case';
import type { WasteLot } from '../domain/waste-lot';
import { toWasteLotHttpException } from './waste-lot-http-errors';

/**
 * API de lotes de residuo e destinacao (R06).
 *
 * Autenticacao: JwtAuthGuard global (F3). Autorizacao: registrar e do Gestor
 * Ambiental; consultar e liberado ao Gestor Ambiental e a Diretoria.
 */
@Controller('waste-lots')
export class WasteLotController {
  constructor(
    private readonly registerWasteDisposal: RegisterWasteDisposal,
    private readonly listWasteLots: ListWasteLots,
  ) {}

  @Post()
  @Roles(APP_ROLES.GESTOR_AMBIENTAL)
  async register(@Body() body: Partial<RegisterDisposalInput>): Promise<WasteLotView> {
    try {
      const lot = await this.registerWasteDisposal.execute({
        wasteTypeId: body?.wasteTypeId,
        location: body?.location,
        receiverCompany: body?.receiverCompany,
        license: body?.license,
        date: body?.date,
        quantity: body?.quantity,
        proofReference: body?.proofReference,
      });
      return this.toView(lot);
    } catch (err) {
      throw toWasteLotHttpException(err);
    }
  }

  @Get()
  @Roles(APP_ROLES.GESTOR_AMBIENTAL, APP_ROLES.DIRETORIA)
  async list(): Promise<WasteLotView[]> {
    return (await this.listWasteLots.execute()).map((lot) => this.toView(lot));
  }

  private toView(lot: WasteLot): WasteLotView {
    return {
      id: lot.id,
      wasteTypeId: lot.wasteTypeId,
      location: lot.location,
      receiverCompany: lot.receiverCompany,
      license: lot.license,
      date: lot.date.toISOString(),
      quantity: lot.quantity,
      proofReference: lot.proofReference,
      status: lot.status,
    };
  }
}
