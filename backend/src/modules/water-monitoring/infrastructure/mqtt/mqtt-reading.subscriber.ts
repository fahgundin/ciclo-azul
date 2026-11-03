import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import mqtt, { type MqttClient } from 'mqtt';
import { MQTT_ROOT_NAMESPACE, MQTT_CONTRACT_VERSION } from '@ciclo-azul/contracts';
import { MqttReadingProcessor } from './mqtt-reading.processor';

/**
 * Adapter de ENTRADA (driving) MQTT.
 *
 * Assina todas as leituras de consumo de agua de qualquer unidade e delega cada
 * mensagem ao MqttReadingProcessor (validacao + dedup + caso de uso). O cliente
 * MQTT fica confinado a esta casca fina; a logica e testada sem broker.
 *
 * Config por ambiente:
 * - MQTT_URL (default mqtt://localhost:1883)
 * - MQTT_INGESTION_ENABLED (default "true"; "false" desliga em ambientes de teste)
 */
@Injectable()
export class MqttReadingSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttReadingSubscriber.name);
  private client?: MqttClient;

  /** Topico com wildcard: todas as unidades. */
  private readonly topic = `${MQTT_ROOT_NAMESPACE}/${MQTT_CONTRACT_VERSION}/sensors/+/water-consumption`;

  constructor(private readonly processor: MqttReadingProcessor) {}

  onModuleInit(): void {
    if ((process.env.MQTT_INGESTION_ENABLED ?? 'true') === 'false') {
      this.logger.log('Ingestao MQTT desabilitada (MQTT_INGESTION_ENABLED=false)');
      return;
    }

    const url = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
    this.client = mqtt.connect(url);

    this.client.on('connect', () => {
      this.logger.log(`Conectado ao broker ${url}; assinando ${this.topic}`);
      this.client?.subscribe(this.topic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Falha ao assinar ${this.topic}: ${err.message}`);
        }
      });
    });

    this.client.on('message', (_topic, payload) => {
      void this.processor.process(payload);
    });

    this.client.on('error', (err) => {
      this.logger.error(`Erro no cliente MQTT: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.endAsync();
  }
}
