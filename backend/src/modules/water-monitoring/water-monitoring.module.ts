import { Module } from '@nestjs/common';
import { RegisterWaterReading } from './application/register-water-reading.use-case';
import { WATER_READING_REPOSITORY } from './domain/water-reading.repository';
import { InMemoryWaterReadingRepository } from './infrastructure/in-memory-water-reading.repository';

/**
 * Modulo de monitoramento de agua (R04/R05).
 *
 * Liga o port WATER_READING_REPOSITORY ao adapter concreto via DI. Trocar de
 * adapter (ex.: Postgres na F2) e uma mudanca local aqui, sem tocar no dominio.
 */
@Module({
  providers: [
    RegisterWaterReading,
    {
      provide: WATER_READING_REPOSITORY,
      useClass: InMemoryWaterReadingRepository,
    },
  ],
  exports: [RegisterWaterReading],
})
export class WaterMonitoringModule {}
