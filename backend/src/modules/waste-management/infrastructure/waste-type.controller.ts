import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import type { CreateWasteTypeInput, WasteTypeView } from '@ciclo-azul/contracts';
import { Roles } from '../../../auth/roles.decorator';
import { APP_ROLES } from '../../../auth/roles';
import { RegisterWasteType } from '../application/register-waste-type.use-case';
import { ListWasteTypes } from '../application/list-waste-types.use-case';
import {
  WasteClassificationRequiredError,
  WasteNameRequiredError,
} from '../domain/waste-type';
import type { WasteType } from '../domain/waste-type';

/**
 * API de tipos de residuo (R07).
 *
 * Autenticacao: garantida pelo JwtAuthGuard global (F3). Autorizacao: restrita ao
 * perfil Gestor Ambiental via @Roles. Erros de invariante de dominio viram 400
 * com a mensagem exata (criterio de aceitacao).
 */
@Controller('waste-types')
@Roles(APP_ROLES.GESTOR_AMBIENTAL)
export class WasteTypeController {
  constructor(
    private readonly registerWasteType: RegisterWasteType,
    private readonly listWasteTypes: ListWasteTypes,
  ) {}

  @Post()
  async create(@Body() body: CreateWasteTypeInput): Promise<WasteTypeView> {
    try {
      const created = await this.registerWasteType.execute({
        name: body?.name,
        classification: body?.classification,
      });
      return this.toView(created);
    } catch (err) {
      if (
        err instanceof WasteClassificationRequiredError ||
        err instanceof WasteNameRequiredError
      ) {
        // Mensagem exata exigida pelo criterio de aceitacao de R07.
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Get()
  async list(): Promise<WasteTypeView[]> {
    const all = await this.listWasteTypes.execute();
    return all.map((wt) => this.toView(wt));
  }

  private toView(wt: WasteType): WasteTypeView {
    return { id: wt.id, name: wt.name, classification: wt.classification };
  }
}
