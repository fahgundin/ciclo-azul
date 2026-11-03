import { Injectable, Logger } from '@nestjs/common';
import { RegisterWaterReading } from '../../application/register-water-reading.use-case';
import { validateReadingPayload } from './reading-payload.validator';
import { ReadingDeduplicator } from './reading-deduplicator';

/** Desfecho do processamento de uma mensagem recebida do broker. */
export type IngestionOutcome = 'registered' | 'duplicate' | 'invalid' | 'error';

/**
 * Orquestra a ingestao de UMA mensagem MQTT crua:
 *   1) parse JSON + validacao de schema (contrato v1)
 *   2) deduplicacao (idempotencia)
 *   3) chamada ao caso de uso RegisterWaterReading
 *
 * Nunca lanca: retorna um desfecho. Assim o subscriber nao derruba o consumer
 * diante de um payload invalido (docs/contrato-iot.md secao 3).
 */
@Injectable()
export class MqttReadingProcessor {
  private readonly logger = new Logger(MqttReadingProcessor.name);

  constructor(
    private readonly registerWaterReading: RegisterWaterReading,
    private readonly deduplicator: ReadingDeduplicator,
  ) {}

  async process(rawMessage: string | Buffer): Promise<IngestionOutcome> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawMessage.toString());
    } catch {
      this.logger.warn('Mensagem MQTT ignorada: JSON invalido');
      return 'invalid';
    }

    const validation = validateReadingPayload(parsed);
    if (!validation.valid) {
      this.logger.warn(`Leitura ignorada: ${validation.error}`);
      return 'invalid';
    }

    const reading = validation.reading;
    if (!this.deduplicator.isNew(reading)) {
      return 'duplicate';
    }

    try {
      await this.registerWaterReading.execute({
        sensorId: reading.sensorId,
        unitId: reading.unitId,
        timestamp: new Date(reading.timestamp),
        valueInLiters: reading.value,
        readingType: reading.readingType,
      });
      return 'registered';
    } catch (err) {
      this.logger.error(`Falha ao registrar leitura: ${(err as Error).message}`);
      return 'error';
    }
  }
}
