import { Module } from '@nestjs/common';
import { RegisterWaterReading } from './application/register-water-reading.use-case';
import { WATER_READING_REPOSITORY } from './domain/water-reading.repository';
import { InMemoryWaterReadingRepository } from './infrastructure/in-memory-water-reading.repository';
import { ReadingDeduplicator } from './infrastructure/mqtt/reading-deduplicator';
import { MqttReadingProcessor } from './infrastructure/mqtt/mqtt-reading.processor';
import { MqttReadingSubscriber } from './infrastructure/mqtt/mqtt-reading.subscriber';

/**
 * Modulo de monitoramento de agua (R04/R05).
 *
 * Liga o port WATER_READING_REPOSITORY ao adapter concreto via DI e registra a
 * cadeia de ingestao MQTT (subscriber -> processor -> dedup -> caso de uso).
 * Trocar de adapter (ex.: Postgres na F2) e uma mudanca local aqui.
 */
@Module({
  providers: [
    RegisterWaterReading,
    {
      provide: WATER_READING_REPOSITORY,
      useClass: InMemoryWaterReadingRepository,
    },
    ReadingDeduplicator,
    MqttReadingProcessor,
    MqttReadingSubscriber,
  ],
  exports: [RegisterWaterReading],
})
export class WaterMonitoringModule {}
