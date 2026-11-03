import { describe, it, expect } from 'vitest';
import { unitRoom, READING_EVENT, SUBSCRIBE_UNIT_EVENT } from './realtime.js';

describe('contrato de tempo real', () => {
  it('monta o nome da room da unidade', () => {
    expect(unitRoom('data-center-sp-01')).toBe('unit:data-center-sp-01');
  });

  it('expoe os nomes de evento estaveis', () => {
    expect(READING_EVENT).toBe('reading');
    expect(SUBSCRIBE_UNIT_EVENT).toBe('subscribe-unit');
  });
});
