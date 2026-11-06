import { WASTE_PROOF_REQUIRED_MESSAGE, type WasteLotStatus } from '@ciclo-azul/contracts';

/** Erro de dominio: campo obrigatorio da destinacao nao informado. */
export class DisposalFieldRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DisposalFieldRequiredError';
  }
}

/**
 * Erro de dominio: comprovante de destinacao nao informado.
 * Carrega a mensagem exata exigida pelo criterio de aceitacao de R06.
 */
export class DisposalProofRequiredError extends Error {
  constructor() {
    super(WASTE_PROOF_REQUIRED_MESSAGE);
    this.name = 'DisposalProofRequiredError';
  }
}

/** Erro de dominio: quantidade destinada invalida. */
export class InvalidDisposalQuantityError extends Error {
  constructor() {
    super('A quantidade destinada deve ser maior que zero');
    this.name = 'InvalidDisposalQuantityError';
  }
}

/** Erro de dominio: data da destinacao invalida ou no futuro. */
export class InvalidDisposalDateError extends Error {
  constructor() {
    super('A data da destinação é inválida ou está no futuro');
    this.name = 'InvalidDisposalDateError';
  }
}

/** Erro de dominio: tipo de residuo informado nao existe. */
export class WasteTypeNotFoundError extends Error {
  constructor() {
    super('Tipo de resíduo não encontrado');
    this.name = 'WasteTypeNotFoundError';
  }
}

/** Texto aparado, ou string vazia quando o valor nao e texto. */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Entidade de dominio: lote de residuo com destinacao registrada (R06).
 *
 * REGRA DA DEPENDENCIA: sem framework/infra. Registrar a destinacao cria o lote ja
 * com status "Destinado". O comprovante e uma REFERENCIA obrigatoria (texto/URL);
 * upload de arquivo nao faz parte desta versao.
 */
export class WasteLot {
  private constructor(
    public readonly id: string,
    public readonly wasteTypeId: string,
    public readonly location: string,
    public readonly receiverCompany: string,
    public readonly license: string,
    public readonly date: Date,
    public readonly quantity: number,
    public readonly proofReference: string,
    public readonly status: WasteLotStatus,
  ) {}

  /**
   * Registra a destinacao de um lote. Valida, nesta ordem: tipo, local, empresa,
   * licenca, data, quantidade e comprovante. `now` e injetado (funcao pura).
   */
  static registerDisposal(
    input: {
      id: string;
      wasteTypeId: unknown;
      location: unknown;
      receiverCompany: unknown;
      license: unknown;
      date: unknown;
      quantity: unknown;
      proofReference: unknown;
    },
    now: Date,
  ): WasteLot {
    const wasteTypeId = text(input.wasteTypeId);
    const location = text(input.location);
    const receiverCompany = text(input.receiverCompany);
    const license = text(input.license);
    const proofReference = text(input.proofReference);

    if (!wasteTypeId) {
      throw new DisposalFieldRequiredError('O tipo de resíduo é obrigatório');
    }
    if (!location) {
      throw new DisposalFieldRequiredError('O local da destinação é obrigatório');
    }
    if (!receiverCompany) {
      throw new DisposalFieldRequiredError('A empresa receptora é obrigatória');
    }
    if (!license) {
      throw new DisposalFieldRequiredError('A licença é obrigatória');
    }

    const dateText = text(input.date);
    const date = dateText ? new Date(dateText) : null;
    if (!date || Number.isNaN(date.getTime()) || date.getTime() > now.getTime()) {
      throw new InvalidDisposalDateError();
    }

    const quantity = input.quantity;
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
      throw new InvalidDisposalQuantityError();
    }

    if (!proofReference) {
      throw new DisposalProofRequiredError();
    }

    return new WasteLot(
      input.id,
      wasteTypeId,
      location,
      receiverCompany,
      license,
      date,
      quantity,
      proofReference,
      'destined',
    );
  }

  /** Reconstitui um lote ja registrado (leitura do banco), sem revalidar a data. */
  static restore(input: {
    id: string;
    wasteTypeId: string;
    location: string;
    receiverCompany: string;
    license: string;
    date: Date;
    quantity: number;
    proofReference: string;
    status: WasteLotStatus;
  }): WasteLot {
    return new WasteLot(
      input.id,
      input.wasteTypeId,
      input.location,
      input.receiverCompany,
      input.license,
      input.date,
      input.quantity,
      input.proofReference,
      input.status,
    );
  }
}
