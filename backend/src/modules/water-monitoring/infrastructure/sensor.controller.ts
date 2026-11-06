import { Body, Controller, Get, Post } from '@nestjs/common';
import type { LinkSensorInput, SensorView } from '@ciclo-azul/contracts';
import { Roles } from '../../../auth/roles.decorator';
import { APP_ROLES } from '../../../auth/roles';
import { LinkSensor } from '../application/link-sensor.use-case';
import { ListSensors } from '../application/list-sensors.use-case';
import type { Sensor } from '../domain/sensor';
import { toHttpException } from './http-errors';

/**
 * API de sensores IoT (R04).
 *
 * Autenticacao: JwtAuthGuard global (F3). Autorizacao: vincular e do Operador (e do
 * Administrador); consultar e liberado aos quatro perfis.
 */
@Controller('sensors')
export class SensorController {
  constructor(
    private readonly linkSensor: LinkSensor,
    private readonly listSensors: ListSensors,
  ) {}

  @Post()
  @Roles(APP_ROLES.OPERADOR, APP_ROLES.ADMINISTRADOR)
  async link(@Body() body: Partial<LinkSensorInput>): Promise<SensorView> {
    try {
      const sensor = await this.linkSensor.execute({
        sensorId: body?.sensorId as string,
        unitId: body?.unitId as string,
      });
      return this.toView(sensor);
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
  async list(): Promise<SensorView[]> {
    return (await this.listSensors.execute()).map((s) => this.toView(s));
  }

  private toView(sensor: Sensor): SensorView {
    return {
      sensorId: sensor.sensorId,
      unitId: sensor.unitId,
      status: sensor.status,
      linkedAt: sensor.linkedAt.toISOString(),
    };
  }
}
