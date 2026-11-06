import { BadRequestException } from '@nestjs/common';
import {
  DisposalFieldRequiredError,
  DisposalProofRequiredError,
  InvalidDisposalDateError,
  InvalidDisposalQuantityError,
  WasteTypeNotFoundError,
} from '../domain/waste-lot';

/**
 * Traduz erros de dominio do R06 em 400, preservando a mensagem exata (inclusive a
 * do comprovante, exigida pelo criterio de aceitacao). Erros desconhecidos sao
 * relancados (viram 500).
 */
export function toWasteLotHttpException(error: unknown): unknown {
  if (
    error instanceof DisposalFieldRequiredError ||
    error instanceof DisposalProofRequiredError ||
    error instanceof InvalidDisposalQuantityError ||
    error instanceof InvalidDisposalDateError ||
    error instanceof WasteTypeNotFoundError
  ) {
    return new BadRequestException(error.message);
  }
  return error;
}
