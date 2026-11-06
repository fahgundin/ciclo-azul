/**
 * Contrato de lotes de residuo e destinacao (R06). Compartilhado entre backend e
 * frontend.
 */

/** Estado do lote. Hoje so existe "destined" (exibido como "Destinado"). */
export type WasteLotStatus = 'destined';

/** Dados para registrar a destinacao de um lote de residuo. */
export interface RegisterDisposalInput {
  /** Tipo de residuo ja cadastrado (R07). */
  wasteTypeId: string;
  /** Local da destinacao. */
  location: string;
  /** Empresa receptora do lote. */
  receiverCompany: string;
  /** Licenca (ambiental) da empresa receptora. */
  license: string;
  /** Data da destinacao (ISO 8601; pode ser so a data, ex.: 2026-11-05). */
  date: string;
  /** Quantidade destinada (> 0). A unidade de medida e pendencia (ver docs). */
  quantity: number;
  /** Referencia do comprovante de destinacao (texto ou URL do documento). */
  proofReference: string;
}

/** Representacao de leitura de um lote com destinacao registrada. */
export interface WasteLotView {
  id: string;
  wasteTypeId: string;
  location: string;
  receiverCompany: string;
  license: string;
  /** ISO 8601 UTC. */
  date: string;
  quantity: number;
  proofReference: string;
  status: WasteLotStatus;
}

/**
 * Mensagem de bloqueio quando o comprovante nao e informado.
 * Valor exato exigido pelo criterio de aceitacao de R06 (HU07).
 */
export const WASTE_PROOF_REQUIRED_MESSAGE = 'O comprovante de destinação é obrigatório';
