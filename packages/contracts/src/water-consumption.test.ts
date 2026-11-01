import { describe, it, expect } from 'vitest';
import {
  waterConsumptionTopic,
  MQTT_CONTRACT_VERSION,
  type WaterConsumptionReading,
} from './water-consumption.js';

describe('contrato de consumo de agua', () => {
  it('monta o topico MQTT da unidade conforme o contrato v1', () => {
    expect(waterConsumptionTopic('data-center-sp-01')).toBe(
      'ciclo-azul/v1/sensors/data-center-sp-01/water-consumption',
    );
  });

  it('expoe a versao atual do contrato', () => {
    expect(MQTT_CONTRACT_VERSION).toBe('v1');
  });

  it('aceita uma leitura valida conforme o tipo', () => {
    const reading: WaterConsumptionReading = {
      schemaVersion: '1.0',
      sensorId: 'sensor-abc-123',
      unitId: 'data-center-sp-01',
      timestamp: '2026-11-01T22:05:30.000Z',
      metric: 'water-consumption',
      value: 1234.56,
      unit: 'liter',
      readingType: 'sensor',
      sequence: 1,
    };
    expect(reading.unitId).toBe('data-center-sp-01');
  });
});
