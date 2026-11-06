import { describe, it, expect } from 'vitest';
import { WASTE_PROOF_REQUIRED_MESSAGE } from './waste-lot.js';

describe('contrato de lote de residuo (R06)', () => {
  it('expoe a mensagem exata de comprovante obrigatorio (criterio R06)', () => {
    expect(WASTE_PROOF_REQUIRED_MESSAGE).toBe('O comprovante de destinação é obrigatório');
  });
});
