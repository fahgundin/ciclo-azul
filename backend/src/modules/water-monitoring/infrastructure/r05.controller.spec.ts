import { CanActivate, ExecutionContext, INestApplication, Injectable } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../../../auth/roles.guard';
import { GetUnitConsumptionStatus } from '../application/get-unit-consumption-status.use-case';
import { LinkSensor } from '../application/link-sensor.use-case';
import { ListUnitsConsumptionStatus } from '../application/list-units-consumption-status.use-case';
import { RegisterWaterReading } from '../application/register-water-reading.use-case';
import { SENSOR_REPOSITORY } from '../domain/sensor.repository';
import { WATER_READING_REPOSITORY } from '../domain/water-reading.repository';
import { InMemorySensorRepository } from './in-memory-sensor.repository';
import { InMemoryWaterReadingRepository } from './in-memory-water-reading.repository';
import { WaterStatusController } from './water-status.controller';

/**
 * Autenticacao falsa de teste: monta request.user a partir do header x-test-roles.
 * O RolesGuard REAL roda em seguida, entao o RBAC e exercitado de verdade. (O
 * JwtAuthGuard e testado a parte, na F3.)
 */
@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const roles = String(req.headers['x-test-roles'] ?? '')
      .split(',')
      .filter(Boolean);
    req.user = { sub: 'test-user', roles };
    return true;
  }
}

const OPERADOR = { 'x-test-roles': 'operador' };

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

describe('R05 — estado de consumo por unidade (API)', () => {
  let app: INestApplication;
  let ingest: RegisterWaterReading;
  let link: LinkSensor;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WaterStatusController],
      providers: [
        GetUnitConsumptionStatus,
        ListUnitsConsumptionStatus,
        RegisterWaterReading,
        LinkSensor,
        { provide: WATER_READING_REPOSITORY, useClass: InMemoryWaterReadingRepository },
        { provide: SENSOR_REPOSITORY, useClass: InMemorySensorRepository },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    ingest = moduleRef.get(RegisterWaterReading);
    link = moduleRef.get(LinkSensor);
  });

  afterEach(async () => {
    await app.close();
  });

  /** Uma leitura chegando de um sensor (o mesmo caso de uso que a ingestao MQTT chama). */
  function sensorReading(unitId: string, timestamp: Date, valueInLiters: number) {
    return {
      sensorId: 'sensor-abc-123',
      unitId,
      timestamp,
      valueInLiters,
      readingType: 'sensor' as const,
    };
  }

  // Cenario: Exibir consumo atualizado de uma unidade
  describe('Cenario: exibir consumo atualizado de uma unidade', () => {
    it('exibe o consumo atual e o atualiza conforme novas leituras sao recebidas', async () => {
      await link.execute({ sensorId: 'sensor-abc-123', unitId: 'data-center-sp-01' });
      await ingest.execute(sensorReading('data-center-sp-01', minutesAgo(2), 1000));

      const first = await request(app.getHttpServer())
        .get('/water-status/data-center-sp-01')
        .set(OPERADOR)
        .expect(200);
      expect(first.body).toMatchObject({
        unitId: 'data-center-sp-01',
        state: 'live',
        currentValueInLiters: 1000,
        lastReadingType: 'sensor',
        staleAfterMinutes: 15,
      });
      expect(first.body.lastReadingAt).toBeTruthy();

      // Uma nova leitura chega: o valor exibido acompanha.
      await ingest.execute(sensorReading('data-center-sp-01', minutesAgo(1), 1100));

      const second = await request(app.getHttpServer())
        .get('/water-status/data-center-sp-01')
        .set(OPERADOR)
        .expect(200);
      expect(second.body).toMatchObject({ state: 'live', currentValueInLiters: 1100 });
    });
  });

  // Cenario: Indicar unidade sem leitura recente
  describe('Cenario: indicar unidade sem leitura recente', () => {
    it('sinaliza a unidade sem leitura ha mais de 15 minutos como stale', async () => {
      await ingest.execute(sensorReading('data-center-rj-02', minutesAgo(20), 900));

      const res = await request(app.getHttpServer())
        .get('/water-status/data-center-rj-02')
        .set(OPERADOR)
        .expect(200);

      expect(res.body.state).toBe('stale');
      expect(res.body.currentValueInLiters).toBe(900); // mantem o ultimo valor conhecido
      expect(res.body.staleAfterMinutes).toBe(15);
    });

    it('uma leitura de 14 minutos atras ainda e recente', async () => {
      await ingest.execute(sensorReading('u1', minutesAgo(14), 5));

      const res = await request(app.getHttpServer()).get('/water-status/u1').set(OPERADOR).expect(200);
      expect(res.body.state).toBe('live');
    });

    it('a unidade volta a live quando chega uma leitura nova', async () => {
      await ingest.execute(sensorReading('u1', minutesAgo(30), 5));
      expect(
        (await request(app.getHttpServer()).get('/water-status/u1').set(OPERADOR)).body.state,
      ).toBe('stale');

      await ingest.execute(sensorReading('u1', minutesAgo(0), 6));
      expect(
        (await request(app.getHttpServer()).get('/water-status/u1').set(OPERADOR)).body.state,
      ).toBe('live');
    });
  });

  describe('demais casos', () => {
    it('unidade sem nenhuma leitura devolve no-data', async () => {
      const res = await request(app.getHttpServer())
        .get('/water-status/data-center-nova')
        .set(OPERADOR)
        .expect(200);
      expect(res.body).toEqual({
        unitId: 'data-center-nova',
        state: 'no-data',
        currentValueInLiters: null,
        lastReadingAt: null,
        lastReadingType: null,
        staleAfterMinutes: 15,
      });
    });

    it('lista o estado de todas as unidades conhecidas, ordenado por unitId', async () => {
      await ingest.execute(sensorReading('data-center-sp-01', minutesAgo(1), 1200));
      await ingest.execute(sensorReading('data-center-rj-02', minutesAgo(40), 900));
      await link.execute({ sensorId: 'sensor-xyz-789', unitId: 'data-center-rs-05' });

      const res = await request(app.getHttpServer()).get('/water-status').set(OPERADOR).expect(200);

      expect(res.body.map((s: { unitId: string; state: string }) => [s.unitId, s.state])).toEqual([
        ['data-center-rj-02', 'stale'],
        ['data-center-rs-05', 'no-data'],
        ['data-center-sp-01', 'live'],
      ]);
    });

    it('lista vazia quando nao ha unidades conhecidas', async () => {
      const res = await request(app.getHttpServer()).get('/water-status').set(OPERADOR).expect(200);
      expect(res.body).toEqual([]);
    });

    it('rejeita unidade em branco (400)', async () => {
      await request(app.getHttpServer()).get('/water-status/%20').set(OPERADOR).expect(400);
    });
  });

  describe('permissoes por perfil (RBAC)', () => {
    it.each(['operador', 'administrador', 'gestor-ambiental', 'diretoria'])(
      '%s pode consultar o estado de consumo',
      async (role) => {
        const headers = { 'x-test-roles': role };
        await request(app.getHttpServer()).get('/water-status').set(headers).expect(200);
        await request(app.getHttpServer()).get('/water-status/u1').set(headers).expect(200);
      },
    );

    it('usuario sem nenhum papel conhecido e barrado (403)', async () => {
      await request(app.getHttpServer()).get('/water-status').expect(403);
      await request(app.getHttpServer()).get('/water-status/u1').expect(403);
    });
  });
});
