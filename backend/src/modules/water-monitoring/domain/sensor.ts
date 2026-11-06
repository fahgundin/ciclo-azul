import { MANUAL_READING_SENSOR_ID, type SensorStatus } from '@ciclo-azul/contracts';

/** Erro de dominio: identificador de sensor invalido. */
export class InvalidSensorIdError extends Error {
  constructor() {
    super(
      'Identificador de sensor inválido: use de 3 a 64 caracteres (letras, números, ponto, hífen ou sublinhado)',
    );
    this.name = 'InvalidSensorIdError';
  }
}

/** Erro de dominio: unidade nao informada. */
export class UnitRequiredError extends Error {
  constructor() {
    super('A unidade é obrigatória');
    this.name = 'UnitRequiredError';
  }
}

/** Erro de dominio: sensor ja vinculado. */
export class SensorAlreadyLinkedError extends Error {
  constructor(sensorId: string) {
    super(`O sensor ${sensorId} já está vinculado a uma unidade`);
    this.name = 'SensorAlreadyLinkedError';
  }
}

/** Formato aceito para o identificador de um sensor. */
const SENSOR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/;

/**
 * Entidade de dominio: sensor IoT vinculado a uma unidade (R04).
 *
 * REGRA DA DEPENDENCIA: sem framework/infra. Um sensor vinculado fica "Conectado".
 */
export class Sensor {
  private constructor(
    public readonly sensorId: string,
    public readonly unitId: string,
    public readonly status: SensorStatus,
    public readonly linkedAt: Date,
  ) {}

  static link(input: { sensorId: string; unitId: string; linkedAt: Date }): Sensor {
    const sensorId = input.sensorId?.trim() ?? '';
    const unitId = input.unitId?.trim() ?? '';

    // "manual" e reservado para leituras lancadas a mao: nao e um sensor fisico.
    if (!SENSOR_ID_PATTERN.test(sensorId) || sensorId.toLowerCase() === MANUAL_READING_SENSOR_ID) {
      throw new InvalidSensorIdError();
    }
    if (!unitId) {
      throw new UnitRequiredError();
    }
    return new Sensor(sensorId, unitId, 'connected', input.linkedAt);
  }
}
