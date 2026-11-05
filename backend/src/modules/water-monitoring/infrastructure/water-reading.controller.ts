import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { ManualReadingInput, WaterReadingView } from '@ciclo-azul/contracts';
import { Roles } from '../../../auth/roles.decorator';
import { APP_ROLES } from '../../../auth/roles';
import { ListWaterReadings } from '../application/list-water-readings.use-case';
import { RegisterManualReading } from '../application/register-manual-reading.use-case';
import type { WaterReading } from '../domain/water-reading';
import { toHttpException } from './http-errors';

/**
 * API de leituras de consumo de agua (R04).
 *
 * Leitura manual e do Operador; o historico por unidade e liberado aos quatro
 * perfis. Autenticacao: JwtAuthGuard global (F3).
 */
@Controller('water-readings')
export class WaterReadingController {
  constructor(
    private readonly registerManualReading: RegisterManualReading,
    private readonly listWaterReadings: ListWaterReadings,
  ) {}

  @Post('manual')
  @Roles(APP_ROLES.OPERADOR)
  async registerManual(@Body() body: Partial<ManualReadingInput>): Promise<WaterReadingView> {
    try {
      const reading = await this.registerManualReading.execute({
        unitId: body?.unitId,
        valueInLiters: body?.valueInLiters,
        date: body?.date,
      });
      return this.toView(reading);
    } catch (err) {
      throw toHttpException(err);
    }
  }

  @Get()
  @Roles(
    APP_ROLES.OPERADOR,
    APP_ROLES.ADMINISTRADOR,
    APP_ROLES.GESTOR_AMBIENTAL,
    APP_ROLES.DIRETORIA,
  )
  async history(@Query('unitId') unitId?: string): Promise<WaterReadingView[]> {
    try {
      return (await this.listWaterReadings.execute(unitId)).map((r) => this.toView(r));
    } catch (err) {
      throw toHttpException(err);
    }
  }

  private toView(reading: WaterReading): WaterReadingView {
    return {
      sensorId: reading.sensorId,
      unitId: reading.unitId,
      timestamp: reading.timestamp.toISOString(),
      valueInLiters: reading.valueInLiters,
      readingType: reading.readingType,
    };
  }
}
