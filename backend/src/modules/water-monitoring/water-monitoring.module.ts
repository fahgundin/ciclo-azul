import { Module, type Provider } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DatabaseModule, isDatabaseEnabled } from '../../database/database.module';
import { RegisterWaterReading } from './application/register-water-reading.use-case';
import { READING_PUBLISHER } from './application/reading-publisher';
import { WATER_READING_REPOSITORY } from './domain/water-reading.repository';
import { InMemoryWaterReadingRepository } from './infrastructure/in-memory-water-reading.repository';
import { PostgresWaterReadingRepository } from './infrastructure/persistence/postgres-water-reading.repository';
import { ReadingDeduplicator } from './infrastructure/mqtt/reading-deduplicator';
import { MqttReadingProcessor } from './infrastructure/mqtt/mqtt-reading.processor';
import { MqttReadingSubscriber } from './infrastructure/mqtt/mqtt-reading.subscriber';
import { WaterMonitoringGateway } from './infrastructure/ws/water-monitoring.gateway';

/**
 * Modulo de monitoramento de agua (R04/R05).
 *
 * Fluxo: MqttReadingSubscriber -> MqttReadingProcessor -> (valida + deduplica) ->
 * RegisterWaterReading (persiste) -> ReadingPublisher (gateway WebSocket).
 *
 * O adapter de persistencia e escolhido por ambiente (Postgres via DATABASE_URL,
 * senao in-memory).
 */
const repositoryProvider: Provider = isDatabaseEnabled()
  ? { provide: WATER_READING_REPOSITORY, useClass: PostgresWaterReadingRepository }
  : { provide: WATER_READING_REPOSITORY, useClass: InMemoryWaterReadingRepository };

@Module({
  imports: [AuthModule, DatabaseModule.forFeature()],
  providers: [
    RegisterWaterReading,
    repositoryProvider,
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
