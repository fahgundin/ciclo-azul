import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { WaterMonitoringModule } from './modules/water-monitoring/water-monitoring.module';

/**
 * Modulo raiz. Agrega os modulos de dominio.
 * Novos modulos seguem a estrutura domain/ application/ infrastructure/.
 */
@Module({
  imports: [WaterMonitoringModule],
  controllers: [HealthController],
})
export class AppModule {}
