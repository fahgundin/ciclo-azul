import { describe, it, expect } from 'vitest';
import { WASTE_CLASSIFICATION_REQUIRED_MESSAGE } from './waste-type.js';

describe('contrato de tipo de residuo', () => {
  it('expoe a mensagem exata de classificacao obrigatoria (criterio R07)', () => {
    expect(WASTE_CLASSIFICATION_REQUIRED_MESSAGE).toBe(
      'A classificação do resíduo é obrigatória',
    );
  });
});
