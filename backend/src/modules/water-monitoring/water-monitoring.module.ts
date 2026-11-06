import { Module, type Provider } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DatabaseModule, isDatabaseEnabled } from '../../database/database.module';
import { LinkSensor } from './application/link-sensor.use-case';
import { ListSensors } from './application/list-sensors.use-case';
import { ListWaterReadings } from './application/list-water-readings.use-case';
import { READING_PUBLISHER } from './application/reading-publisher';
import { RegisterManualReading } from './application/register-manual-reading.use-case';
import { RegisterWaterReading } from './application/register-water-reading.use-case';
import { SENSOR_REPOSITORY } from './domain/sensor.repository';
import { WATER_READING_REPOSITORY } from './domain/water-reading.repository';
import { InMemorySensorRepository } from './infrastructure/in-memory-sensor.repository';
import { InMemoryWaterReadingRepository } from './infrastructure/in-memory-water-reading.repository';
import { PostgresSensorRepository } from './infrastructure/persistence/postgres-sensor.repository';
import { PostgresWaterReadingRepository } from './infrastructure/persistence/postgres-water-reading.repository';
import { ReadingDeduplicator } from './infrastructure/mqtt/reading-deduplicator';
import { MqttReadingProcessor } from './infrastructure/mqtt/mqtt-reading.processor';
import { MqttReadingSubscriber } from './infrastructure/mqtt/mqtt-reading.subscriber';
import { SensorController } from './infrastructure/sensor.controller';
import { WaterReadingController } from './infrastructure/water-reading.controller';
import { WaterMonitoringGateway } from './infrastructure/ws/water-monitoring.gateway';

/**
 * Modulo de monitoramento de agua (R04/R05).
 *
 * Ingestao: MqttReadingSubscriber -> MqttReadingProcessor -> (valida + deduplica) ->
 * RegisterWaterReading (persiste) -> ReadingPublisher (gateway WebSocket).
 *
 * API REST (R04): sensores (vincular/listar) e leituras (manual/historico).
 *
 * Os adapters de persistencia sao escolhidos por ambiente (Postgres via
 * DATABASE_URL, senao in-memory).
 */
const waterReadingRepositoryProvider: Provider = isDatabaseEnabled()
  ? { provide: WATER_READING_REPOSITORY, useClass: PostgresWaterReadingRepository }
  : { provide: WATER_READING_REPOSITORY, useClass: InMemoryWaterReadingRepository };

const sensorRepositoryProvider: Provider = isDatabaseEnabled()
  ? { provide: SENSOR_REPOSITORY, useClass: PostgresSensorRepository }
  : { provide: SENSOR_REPOSITORY, useClass: InMemorySensorRepository };

@Module({
  imports: [AuthModule, DatabaseModule.forFeature()],
  controllers: [SensorController, WaterReadingController],
  providers: [
    RegisterWaterReading,
    LinkSensor,
    ListSensors,
    RegisterManualReading,
    ListWaterReadings,
    waterReadingRepositoryProvider,
    sensorRepositoryProvider,
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
