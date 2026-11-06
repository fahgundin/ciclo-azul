import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  InvalidSensorIdError,
  SensorAlreadyLinkedError,
  UnitRequiredError,
} from '../domain/sensor';
import {
  ManualReadingDateError,
  ManualReadingValueError,
  UnitHasSensorError,
} from '../domain/manual-reading';

/**
 * Traduz erros de dominio do R04 em respostas HTTP: validacao -> 400 e conflito
 * de estado -> 409, sempre preservando a mensagem do dominio. Erros desconhecidos
 * sao relancados (viram 500).
 */
export function toHttpException(error: unknown): unknown {
  if (
    error instanceof InvalidSensorIdError ||
    error instanceof UnitRequiredError ||
    error instanceof ManualReadingValueError ||
    error instanceof ManualReadingDateError
  ) {
    return new BadRequestException(error.message);
  }
  if (error instanceof SensorAlreadyLinkedError || error instanceof UnitHasSensorError) {
    return new ConflictException(error.message);
  }
  return error;
}
