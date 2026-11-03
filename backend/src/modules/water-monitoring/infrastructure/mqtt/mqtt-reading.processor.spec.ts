import { MqttReadingProcessor } from './mqtt-reading.processor';
import { ReadingDeduplicator } from './reading-deduplicator';
import type { RegisterWaterReading } from '../../application/register-water-reading.use-case';

function validJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: '1.0',
    sensorId: 'sensor-abc-123',
    unitId: 'data-center-sp-01',
    timestamp: new Date().toISOString(),
    metric: 'water-consumption',
    value: 100,
    unit: 'liter',
    readingType: 'sensor',
    sequence: 1,
    ...overrides,
  });
}

describe('MqttReadingProcessor', () => {
  let register: { execute: jest.Mock };
  let publisher: { publish: jest.Mock };
  let processor: MqttReadingProcessor;

  beforeEach(() => {
    register = { execute: jest.fn().mockResolvedValue(undefined) };
    publisher = { publish: jest.fn() };
    processor = new MqttReadingProcessor(
      register as unknown as RegisterWaterReading,
      new ReadingDeduplicator(),
      publisher,
    );
  });

  it('registra uma leitura valida', async () => {
    const outcome = await processor.process(validJson());
    expect(outcome).toBe('registered');
    expect(register.execute).toHaveBeenCalledTimes(1);
  });

  it('publica o evento de tempo real apos registrar', async () => {
    await processor.process(validJson({ sequence: 123, unitId: 'u-x' }));
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ unitId: 'u-x', readingType: 'sensor' }),
    );
  });

  it('nao publica quando o payload e invalido', async () => {
    await processor.process(validJson({ value: -5 }));
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('ignora JSON malformado sem lancar', async () => {
    const outcome = await processor.process('isto nao e json');
    expect(outcome).toBe('invalid');
    expect(register.execute).not.toHaveBeenCalled();
  });

  it('ignora payload invalido (value negativo) sem lancar', async () => {
    const outcome = await processor.process(validJson({ value: -5 }));
    expect(outcome).toBe('invalid');
    expect(register.execute).not.toHaveBeenCalled();
  });

  it('descarta duplicata (mesmo sensorId+sequence)', async () => {
    await processor.process(validJson({ sequence: 7 }));
    const outcome = await processor.process(validJson({ sequence: 7 }));
    expect(outcome).toBe('duplicate');
    expect(register.execute).toHaveBeenCalledTimes(1);
  });

  it('retorna error quando o caso de uso falha (sem derrubar)', async () => {
    register.execute.mockRejectedValueOnce(new Error('db down'));
    const outcome = await processor.process(validJson({ sequence: 99 }));
    expect(outcome).toBe('error');
  });
});
