import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { WaterMonitoringModule } from './modules/water-monitoring/water-monitoring.module';
import { WasteManagementModule } from './modules/waste-management/waste-management.module';

/**
 * Modulo raiz. Agrega os modulos de dominio.
 * Novos modulos seguem a estrutura domain/ application/ infrastructure/.
 */
@Module({
  imports: [
    DatabaseModule.forRoot(),
    AuthModule,
    WaterMonitoringModule,
    WasteManagementModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
