import { CanActivate, ExecutionContext, INestApplication, Injectable } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../../../auth/roles.guard';
import { LinkSensor } from '../application/link-sensor.use-case';
import { ListSensors } from '../application/list-sensors.use-case';
import { ListWaterReadings } from '../application/list-water-readings.use-case';
import { RegisterManualReading } from '../application/register-manual-reading.use-case';
import { SENSOR_REPOSITORY } from '../domain/sensor.repository';
import { WATER_READING_REPOSITORY } from '../domain/water-reading.repository';
import { InMemorySensorRepository } from './in-memory-sensor.repository';
import { InMemoryWaterReadingRepository } from './in-memory-water-reading.repository';
import { SensorController } from './sensor.controller';
import { WaterReadingController } from './water-reading.controller';

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

/** Data (so dia) deslocada em dias a partir de hoje, em UTC. */
function utcDay(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

describe('R04 — sensores e leituras manuais (API)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SensorController, WaterReadingController],
      providers: [
        LinkSensor,
        ListSensors,
        RegisterManualReading,
        ListWaterReadings,
        { provide: SENSOR_REPOSITORY, useClass: InMemorySensorRepository },
        { provide: WATER_READING_REPOSITORY, useClass: InMemoryWaterReadingRepository },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // Cenario: Conectar um sensor IoT com sucesso
  describe('Cenario: conectar um sensor IoT com sucesso', () => {
    it('vincula o sensor a uma unidade e o registra como Conectado', async () => {
      const res = await request(app.getHttpServer())
        .post('/sensors')
        .set(OPERADOR)
        .send({ sensorId: 'sensor-abc-123', unitId: 'data-center-sp-01' })
        .expect(201);

      expect(res.body).toMatchObject({
        sensorId: 'sensor-abc-123',
        unitId: 'data-center-sp-01',
        status: 'connected',
      });
      expect(res.body.linkedAt).toBeTruthy();

      const list = await request(app.getHttpServer()).get('/sensors').set(OPERADOR).expect(200);
      expect(list.body).toEqual([expect.objectContaining({ sensorId: 'sensor-abc-123' })]);
    });

    it('rejeita identificador de sensor invalido (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/sensors')
        .set(OPERADOR)
        .send({ sensorId: 'x', unitId: 'data-center-sp-01' })
        .expect(400);
      expect(res.body.message).toContain('Identificador de sensor inválido');
    });

    it('rejeita sensor sem unidade (400)', async () => {
      await request(app.getHttpServer())
        .post('/sensors')
        .set(OPERADOR)
        .send({ sensorId: 'sensor-abc-123' })
        .expect(400);
    });

    it('rejeita vincular o mesmo sensor duas vezes (409)', async () => {
      const body = { sensorId: 'sensor-abc-123', unitId: 'data-center-sp-01' };
      await request(app.getHttpServer()).post('/sensors').set(OPERADOR).send(body).expect(201);
      await request(app.getHttpServer()).post('/sensors').set(OPERADOR).send(body).expect(409);
    });
  });

  // Cenario: Registrar leitura manual na ausencia de sensor
  describe('Cenario: registrar leitura manual na ausencia de sensor', () => {
    it('registra a leitura associada a unidade e a deixa no historico', async () => {
      const created = await request(app.getHttpServer())
        .post('/water-readings/manual')
        .set(OPERADOR)
        .send({ unitId: 'data-center-rj-02', valueInLiters: 1500, date: utcDay(-1) })
        .expect(201);

      expect(created.body).toMatchObject({
        sensorId: 'manual',
        unitId: 'data-center-rj-02',
        valueInLiters: 1500,
        readingType: 'manual',
      });

      const history = await request(app.getHttpServer())
        .get('/water-readings')
        .query({ unitId: 'data-center-rj-02' })
        .set(OPERADOR)
        .expect(200);
      expect(history.body).toEqual([
        expect.objectContaining({ valueInLiters: 1500, readingType: 'manual' }),
      ]);
    });

    it('bloqueia a leitura manual quando a unidade tem sensor conectado (409)', async () => {
      await request(app.getHttpServer())
        .post('/sensors')
        .set(OPERADOR)
        .send({ sensorId: 'sensor-abc-123', unitId: 'data-center-sp-01' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/water-readings/manual')
        .set(OPERADOR)
        .send({ unitId: 'data-center-sp-01', valueInLiters: 100, date: utcDay(0) })
        .expect(409);
      expect(res.body.message).toContain('possui sensor conectado');
    });

    it.each([
      ['volume zero', { valueInLiters: 0, date: utcDay(0) }],
      ['volume negativo', { valueInLiters: -3, date: utcDay(0) }],
      ['volume ausente', { date: utcDay(0) }],
      ['data no futuro', { valueInLiters: 10, date: utcDay(2) }],
      ['data com mais de 28 dias', { valueInLiters: 10, date: utcDay(-40) }],
      ['data ausente', { valueInLiters: 10 }],
    ])('rejeita leitura invalida (400): %s', async (_label, payload) => {
      await request(app.getHttpServer())
        .post('/water-readings/manual')
        .set(OPERADOR)
        .send({ unitId: 'data-center-rj-02', ...payload })
        .expect(400);

      const history = await request(app.getHttpServer())
        .get('/water-readings')
        .query({ unitId: 'data-center-rj-02' })
        .set(OPERADOR)
        .expect(200);
      expect(history.body).toEqual([]);
    });

    it('aceita a data limite de 28 dias atras', async () => {
      await request(app.getHttpServer())
        .post('/water-readings/manual')
        .set(OPERADOR)
        .send({ unitId: 'data-center-rj-02', valueInLiters: 10, date: utcDay(-28) })
        .expect(201);
    });

    it('exige a unidade ao consultar o historico (400)', async () => {
      await request(app.getHttpServer()).get('/water-readings').set(OPERADOR).expect(400);
    });
  });

  describe('permissoes por perfil (RBAC)', () => {
    const sensorBody = { sensorId: 'sensor-abc-123', unitId: 'data-center-sp-01' };
    const readingBody = { unitId: 'data-center-rj-02', valueInLiters: 10, date: utcDay(0) };

    it.each(['gestor-ambiental', 'diretoria'])('%s nao pode vincular sensor (403)', async (role) => {
      await request(app.getHttpServer())
        .post('/sensors')
        .set({ 'x-test-roles': role })
        .send(sensorBody)
        .expect(403);
    });

    it('administrador pode vincular sensor', async () => {
      await request(app.getHttpServer())
        .post('/sensors')
        .set({ 'x-test-roles': 'administrador' })
        .send(sensorBody)
        .expect(201);
    });

    it.each(['administrador', 'gestor-ambiental', 'diretoria'])(
      '%s nao pode lancar leitura manual (403)',
      async (role) => {
        await request(app.getHttpServer())
          .post('/water-readings/manual')
          .set({ 'x-test-roles': role })
          .send(readingBody)
          .expect(403);
      },
    );

    it.each(['operador', 'administrador', 'gestor-ambiental', 'diretoria'])(
      '%s pode consultar sensores e historico',
      async (role) => {
        const headers = { 'x-test-roles': role };
        await request(app.getHttpServer()).get('/sensors').set(headers).expect(200);
        await request(app.getHttpServer())
          .get('/water-readings')
          .query({ unitId: 'u1' })
          .set(headers)
          .expect(200);
      },
    );

    it('usuario sem nenhum papel conhecido e barrado (403)', async () => {
      await request(app.getHttpServer()).get('/sensors').expect(403);
    });
  });
});
