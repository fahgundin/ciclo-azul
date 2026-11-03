import type { WaterConsumptionReading } from '@ciclo-azul/contracts';

/**
 * Deduplicador de leituras (idempotencia).
 *
 * Como o MQTT QoS 1 pode entregar a mesma mensagem mais de uma vez, o backend
 * descarta duplicatas pela chave (sensorId + sequence) quando ha sequence, ou
 * (sensorId + timestamp) caso contrario. Ver docs/contrato-iot.md secao 4.
 *
 * Implementacao em memoria com janela maxima de chaves (LRU simples) para nao
 * crescer indefinidamente. Suficiente para o MVP; pode virar um adapter com
 * store compartilhado no futuro.
 */
export class ReadingDeduplicator {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];

  constructor(private readonly maxKeys = 10_000) {}

  private key(reading: WaterConsumptionReading): string {
    const discriminator =
      reading.sequence !== undefined ? `seq:${reading.sequence}` : `ts:${reading.timestamp}`;
    return `${reading.sensorId}|${discriminator}`;
  }

  /**
   * Retorna true se a leitura e nova (e a registra); false se for duplicata.
   */
  isNew(reading: WaterConsumptionReading): boolean {
    const key = this.key(reading);
    if (this.seen.has(key)) {
      return false;
    }
    this.seen.add(key);
    this.order.push(key);
    if (this.order.length > this.maxKeys) {
      const evicted = this.order.shift();
      if (evicted !== undefined) {
        this.seen.delete(evicted);
      }
    }
    return true;
  }
}
