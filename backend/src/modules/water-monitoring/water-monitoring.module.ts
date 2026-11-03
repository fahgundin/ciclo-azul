import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { RegisterWaterReading } from './application/register-water-reading.use-case';
import { READING_PUBLISHER } from './application/reading-publisher';
import { WATER_READING_REPOSITORY } from './domain/water-reading.repository';
import { InMemoryWaterReadingRepository } from './infrastructure/in-memory-water-reading.repository';
import { ReadingDeduplicator } from './infrastructure/mqtt/reading-deduplicator';
import { MqttReadingProcessor } from './infrastructure/mqtt/mqtt-reading.processor';
import { MqttReadingSubscriber } from './infrastructure/mqtt/mqtt-reading.subscriber';
import { WaterMonitoringGateway } from './infrastructure/ws/water-monitoring.gateway';

/**
 * Modulo de monitoramento de agua (R04/R05).
 *
 * Fluxo de ingestao: MqttReadingSubscriber -> MqttReadingProcessor -> (valida +
 * deduplica) -> RegisterWaterReading (persiste) -> ReadingPublisher (tempo real).
 *
 * O WaterMonitoringGateway e o adapter concreto do port READING_PUBLISHER,
 * emitindo via WebSocket por unidade (room).
 */
@Module({
  imports: [AuthModule],
  providers: [
    RegisterWaterReading,
    {
      provide: WATER_READING_REPOSITORY,
      useClass: InMemoryWaterReadingRepository,
    },
    ReadingDeduplicator,
    MqttReadingProcessor,
    MqttReadingSubscriber,
    WaterMonitoringGateway,
    {
      provide: READING_PUBLISHER,
      useExisting: WaterMonitoringGateway,
    },
  ],
  exports: [RegisterWaterReading],
})
export class WaterMonitoringModule {}
