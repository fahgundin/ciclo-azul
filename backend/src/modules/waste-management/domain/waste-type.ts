import { WASTE_CLASSIFICATION_REQUIRED_MESSAGE } from '@ciclo-azul/contracts';

/**
 * Erro de dominio: tipo de residuo sem classificacao.
 * Carrega a mensagem exata exigida pelo criterio de aceitacao de R07.
 */
export class WasteClassificationRequiredError extends Error {
  constructor() {
    super(WASTE_CLASSIFICATION_REQUIRED_MESSAGE);
    this.name = 'WasteClassificationRequiredError';
  }
}

/** Erro de dominio: tipo de residuo sem nome. */
export class WasteNameRequiredError extends Error {
  constructor() {
    super('O nome do resíduo é obrigatório');
    this.name = 'WasteNameRequiredError';
  }
}

/**
 * Entidade de dominio: tipo de residuo gerado pela operacao (R07).
 *
 * REGRA DA DEPENDENCIA: sem framework/infra. A classificacao e invariante
 * obrigatoria, garantida na factory.
 */
export class WasteType {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly classification: string,
  ) {}

  static create(input: { id: string; name: string; classification: string }): WasteType {
    const name = input.name?.trim() ?? '';
    const classification = input.classification?.trim() ?? '';

    if (!name) {
      throw new WasteNameRequiredError();
    }
    if (!classification) {
      throw new WasteClassificationRequiredError();
    }
    return new WasteType(input.id, name, classification);
  }
}
