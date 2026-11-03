import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { WaterMonitoringModule } from './modules/water-monitoring/water-monitoring.module';

/**
 * Modulo raiz. Agrega os modulos de dominio.
 * Novos modulos seguem a estrutura domain/ application/ infrastructure/.
 */
@Module({
  imports: [AuthModule, WaterMonitoringModule],
  controllers: [HealthController],
})
export class AppModule {}
