import { InvalidSensorIdError, Sensor, UnitRequiredError } from './sensor';

describe('Sensor (dominio)', () => {
  const linkedAt = new Date('2026-11-05T12:00:00.000Z');

  it('vincula um sensor valido a uma unidade e o deixa conectado', () => {
    const sensor = Sensor.link({ sensorId: 'sensor-abc-123', unitId: 'data-center-sp-01', linkedAt });
    expect(sensor.sensorId).toBe('sensor-abc-123');
    expect(sensor.unitId).toBe('data-center-sp-01');
    expect(sensor.status).toBe('connected');
    expect(sensor.linkedAt).toBe(linkedAt);
  });

  it('remove espacos nas pontas do identificador e da unidade', () => {
    const sensor = Sensor.link({ sensorId: '  sensor-01 ', unitId: ' u1 ', linkedAt });
    expect(sensor.sensorId).toBe('sensor-01');
    expect(sensor.unitId).toBe('u1');
  });

  it.each([
    ['vazio', ''],
    ['so espacos', '   '],
    ['curto demais', 'ab'],
    ['caractere invalido', 'sensor 01'],
    ['comeca com simbolo', '-sensor'],
    ['longo demais', 'a'.repeat(65)],
    ['reservado para leitura manual', 'manual'],
    ['reservado (maiusculas)', 'MANUAL'],
  ])('rejeita identificador de sensor invalido: %s', (_label, sensorId) => {
    expect(() => Sensor.link({ sensorId, unitId: 'u1', linkedAt })).toThrow(InvalidSensorIdError);
  });

  it('rejeita unidade vazia', () => {
    expect(() => Sensor.link({ sensorId: 'sensor-01', unitId: '  ', linkedAt })).toThrow(
      UnitRequiredError,
    );
  });
});
