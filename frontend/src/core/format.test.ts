import { describe, it, expect } from 'vitest';
import { formatDateTime, formatDateUtc, formatLiters, formatNumber, initials } from './format';

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

describe('formatLiters', () => {
  it('usa separadores pt-BR e a unidade L', () => {
    expect(formatLiters(1234.5)).toBe('1.234,5 L');
    expect(formatLiters(80)).toBe('80 L');
  });

  it('limita a duas casas decimais', () => {
    expect(formatLiters(10.12345)).toBe('10,12 L');
  });
});

describe('formatDateUtc', () => {
  it('mostra a data de calendario em UTC, sem voltar um dia', () => {
    // Meia-noite UTC: em horario local do Brasil seria o dia anterior.
    expect(formatDateUtc('2026-11-05T00:00:00.000Z')).toBe('05/11/2026');
  });
});

describe('formatDateTime', () => {
  it('inclui dia, mes, ano e hora', () => {
    expect(formatDateTime('2026-11-05T15:30:00.000Z')).toMatch(
      /^\d{2}\/\d{2}\/2026,? \d{2}:\d{2}$/,
    );
  });
});

describe('formatNumber', () => {
  it('usa separadores pt-BR e ate duas casas decimais', () => {
    expect(formatNumber(1234)).toBe('1.234');
    expect(formatNumber(90.5)).toBe('90,5');
    expect(formatNumber(10.12345)).toBe('10,12');
  });
});
