import { describe, it, expect } from 'vitest';
import { MANUAL_READING_MAX_AGE_DAYS, MANUAL_READING_SENSOR_ID } from './sensor.js';

describe('contrato de sensores e leituras manuais', () => {
  it('a janela de leitura manual e de 28 dias', () => {
    expect(MANUAL_READING_MAX_AGE_DAYS).toBe(28);
  });

  it('leituras manuais usam o sensorId reservado "manual"', () => {
    expect(MANUAL_READING_SENSOR_ID).toBe('manual');
  });
});
