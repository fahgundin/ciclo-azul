/**
 * Contrato de tipos de residuo (R07). Compartilhado entre backend e frontend.
 */

/** Dados para cadastrar um tipo de residuo. */
export interface CreateWasteTypeInput {
  name: string;
  classification: string;
}

/** Representacao de leitura de um tipo de residuo. */
export interface WasteTypeView {
  id: string;
  name: string;
  classification: string;
}

/**
 * Mensagem de bloqueio quando a classificacao nao e informada.
 * Valor exato exigido pelo criterio de aceitacao de R07 (HU06).
 */
export const WASTE_CLASSIFICATION_REQUIRED_MESSAGE = 'A classificação do resíduo é obrigatória';
