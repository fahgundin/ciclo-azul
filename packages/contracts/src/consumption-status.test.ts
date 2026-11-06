import { describe, it, expect } from 'vitest';
import { NO_RECENT_DATA_LABEL, STALE_AFTER_MINUTES } from './consumption-status.js';

describe('contrato de estado de consumo (R05)', () => {
  it('a regra oficial e de 15 minutos sem leitura', () => {
    expect(STALE_AFTER_MINUTES).toBe(15);
  });

  it('o rotulo e exatamente "Sem dados recentes" (criterio de aceitacao R05)', () => {
    expect(NO_RECENT_DATA_LABEL).toBe('Sem dados recentes');
  });
});
