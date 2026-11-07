import { WASTE_PROOF_REQUIRED_MESSAGE } from '@ciclo-azul/contracts';
import type { FieldErrors } from '../forms';

/**
 * Validacao do formulario de destinacao de lote (R06) — core/, agnostico de UI.
 *
 * Usa as MESMAS mensagens do backend (waste-management/domain/waste-lot.ts) so
 * para feedback imediato; a validacao que vale e a do servidor.
 */

export const DISPOSAL_TYPE_REQUIRED = 'O tipo de resíduo é obrigatório';
export const DISPOSAL_LOCATION_REQUIRED = 'O local da destinação é obrigatório';
export const DISPOSAL_COMPANY_REQUIRED = 'A empresa receptora é obrigatória';
export const DISPOSAL_LICENSE_REQUIRED = 'A licença é obrigatória';
export const DISPOSAL_DATE_INVALID = 'A data da destinação é inválida ou está no futuro';
export const DISPOSAL_QUANTITY_INVALID = 'A quantidade destinada deve ser maior que zero';
export const DISPOSAL_PROOF_REQUIRED = WASTE_PROOF_REQUIRED_MESSAGE;

export type DisposalField =
  | 'wasteTypeId'
  | 'location'
  | 'receiverCompany'
  | 'license'
  | 'date'
  | 'quantity'
  | 'proofReference';

export interface DisposalFormValues {
  wasteTypeId: string;
  location: string;
  receiverCompany: string;
  license: string;
  /** AAAA-MM-DD (valor de <input type="date">). */
  date: string;
  quantity: number;
  proofReference: string;
}

export function validateDisposal(
  values: DisposalFormValues,
  now: Date,
): FieldErrors<DisposalField> {
  const errors: FieldErrors<DisposalField> = {};

  if (!values.wasteTypeId.trim()) {
    errors.wasteTypeId = DISPOSAL_TYPE_REQUIRED;
  }
  if (!values.location.trim()) {
    errors.location = DISPOSAL_LOCATION_REQUIRED;
  }
  if (!values.receiverCompany.trim()) {
    errors.receiverCompany = DISPOSAL_COMPANY_REQUIRED;
  }
  if (!values.license.trim()) {
    errors.license = DISPOSAL_LICENSE_REQUIRED;
  }

  const parsed = values.date.trim() ? new Date(values.date) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.getTime() > now.getTime()) {
    errors.date = DISPOSAL_DATE_INVALID;
  }

  if (!Number.isFinite(values.quantity) || values.quantity <= 0) {
    errors.quantity = DISPOSAL_QUANTITY_INVALID;
  }
  if (!values.proofReference.trim()) {
    errors.proofReference = DISPOSAL_PROOF_REQUIRED;
  }

  return errors;
}
