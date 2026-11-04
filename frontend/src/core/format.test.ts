import { describe, it, expect } from 'vitest';
import { initials } from './format';

describe('initials', () => {
  it('usa a primeira letra de ate dois nomes, em maiuscula', () => {
    expect(initials('Marina Costa')).toBe('MC');
    expect(initials('rafael lima souza')).toBe('RL');
  });

  it('funciona com um nome so e com espacos sobrando', () => {
    expect(initials('gestor')).toBe('G');
    expect(initials('  Ana   Souza  ')).toBe('AS');
  });

  it('preserva letras acentuadas', () => {
    expect(initials('érica álvares')).toBe('ÉÁ');
  });

  it('retorna "?" para nome vazio', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });
});
