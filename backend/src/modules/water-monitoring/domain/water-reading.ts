/**
 * Entidade de dominio: leitura de consumo de agua.
 *
 * REGRA DA DEPENDENCIA (hexagonal): este arquivo NAO pode importar NestJS, banco,
 * cliente MQTT, Keycloak nem qualquer infraestrutura. Apenas tipos de contrato e
 * logica de negocio pura. Ver AGENTS.md secao 1 e docs/arquitetura.md.
 */
import type { ReadingType } from '@ciclo-azul/contracts';

export class WaterReading {
  private constructor(
    public readonly sensorId: string,
    public readonly unitId: string,
    public readonly timestamp: Date,
    public readonly valueInLiters: number,
    public readonly readingType: ReadingType,
  ) {}

  /**
   * Factory com invariantes de negocio garantidas.
   * Rejeita valores invalidos antes de a leitura entrar no dominio.
   */
  static create(input: {
    sensorId: string;
    unitId: string;
    timestamp: Date;
    valueInLiters: number;
    readingType: ReadingType;
  }): WaterReading {
    if (!input.sensorId.trim()) {
      throw new Error('sensorId e obrigatorio');
    }
    if (!input.unitId.trim()) {
      throw new Error('unitId e obrigatorio');
    }
    if (Number.isNaN(input.valueInLiters) || input.valueInLiters < 0) {
      throw new Error('valueInLiters deve ser um numero nao negativo');
    }
    return new WaterReading(
      input.sensorId,
      input.unitId,
      input.timestamp,
      input.valueInLiters,
      input.readingType,
    );
  }
}
