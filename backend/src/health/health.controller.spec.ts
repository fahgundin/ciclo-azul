import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('retorna status ok', () => {
    const controller = new HealthController();
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
