import { CanActivate, ExecutionContext, INestApplication, Injectable } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../../../auth/roles.guard';
import { ListWasteLots } from '../application/list-waste-lots.use-case';
import { ListWasteTypes } from '../application/list-waste-types.use-case';
import { RegisterWasteDisposal } from '../application/register-waste-disposal.use-case';
import { RegisterWasteType } from '../application/register-waste-type.use-case';
import { WASTE_LOT_REPOSITORY } from '../domain/waste-lot.repository';
import { WASTE_TYPE_REPOSITORY } from '../domain/waste-type.repository';
import { InMemoryWasteLotRepository } from './in-memory-waste-lot.repository';
import { InMemoryWasteTypeRepository } from './in-memory-waste-type.repository';
import { WasteLotController } from './waste-lot.controller';
import { WasteTypeController } from './waste-type.controller';

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

const GESTOR = { 'x-test-roles': 'gestor-ambiental' };

/** Data (so dia) deslocada em dias a partir de hoje, em UTC. */
function utcDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe('R06 — destinacao de lotes de residuos (API)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WasteTypeController, WasteLotController],
      providers: [
        RegisterWasteType,
        ListWasteTypes,
        RegisterWasteDisposal,
        ListWasteLots,
        { provide: WASTE_TYPE_REPOSITORY, useClass: InMemoryWasteTypeRepository },
        { provide: WASTE_LOT_REPOSITORY, useClass: InMemoryWasteLotRepository },
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

  /** Dado que existe o tipo de residuo "Oleo de refrigeracao" cadastrado. */
  async function createWasteType(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/waste-types')
      .set(GESTOR)
      .send({ name: 'Óleo de refrigeração', classification: 'Metal pesado' })
      .expect(201);
    return res.body.id;
  }

  function disposalBody(wasteTypeId: string, overrides: Record<string, unknown> = {}) {
    return {
      wasteTypeId,
      location: 'Aterro Industrial Classe I - Campinas',
      receiverCompany: 'EcoResiduos Ltda',
      license: 'LO-12345/2026',
      date: utcDay(-1),
      quantity: 250,
      proofReference: 'https://docs.exemplo.com/mtr/987',
      ...overrides,
    };
  }

  // Cenario: Registrar destinacao completa de um lote
  describe('Cenario: registrar destinacao completa de um lote', () => {
    it('salva o registro e o lote consta como Destinado', async () => {
      const wasteTypeId = await createWasteType();

      const created = await request(app.getHttpServer())
        .post('/waste-lots')
        .set(GESTOR)
        .send(disposalBody(wasteTypeId))
        .expect(201);

      expect(created.body).toMatchObject({
        wasteTypeId,
        location: 'Aterro Industrial Classe I - Campinas',
        receiverCompany: 'EcoResiduos Ltda',
        license: 'LO-12345/2026',
        quantity: 250,
        proofReference: 'https://docs.exemplo.com/mtr/987',
        status: 'destined',
      });
      expect(created.body.id).toBeTruthy();

      const list = await request(app.getHttpServer()).get('/waste-lots').set(GESTOR).expect(200);
      expect(list.body).toEqual([expect.objectContaining({ id: created.body.id, status: 'destined' })]);
    });
  });

  // Cenario: Impedir registro sem comprovante
  describe('Cenario: impedir registro sem comprovante', () => {
    it.each([
      ['vazio', ''],
      ['so espacos', '   '],
    ])('bloqueia o registro com a mensagem exata (400): comprovante %s', async (_label, proof) => {
      const wasteTypeId = await createWasteType();

      const res = await request(app.getHttpServer())
        .post('/waste-lots')
        .set(GESTOR)
        .send(disposalBody(wasteTypeId, { proofReference: proof }))
        .expect(400);

      expect(res.body.message).toBe('O comprovante de destinação é obrigatório');
      const list = await request(app.getHttpServer()).get('/waste-lots').set(GESTOR).expect(200);
      expect(list.body).toEqual([]);
    });

    it('bloqueia quando o comprovante nem e enviado', async () => {
      const wasteTypeId = await createWasteType();
      const { proofReference, ...withoutProof } = disposalBody(wasteTypeId);
      void proofReference;

      const res = await request(app.getHttpServer())
        .post('/waste-lots')
        .set(GESTOR)
        .send(withoutProof)
        .expect(400);
      expect(res.body.message).toBe('O comprovante de destinação é obrigatório');
    });
  });

  describe('outras validacoes', () => {
    it.each([
      ['sem local', { location: '' }, 'O local da destinação é obrigatório'],
      ['sem empresa receptora', { receiverCompany: ' ' }, 'A empresa receptora é obrigatória'],
      ['sem licenca', { license: '' }, 'A licença é obrigatória'],
      ['quantidade zero', { quantity: 0 }, 'A quantidade destinada deve ser maior que zero'],
      ['quantidade negativa', { quantity: -3 }, 'A quantidade destinada deve ser maior que zero'],
      ['quantidade em texto', { quantity: '250' }, 'A quantidade destinada deve ser maior que zero'],
      ['data no futuro', { date: utcDay(2) }, 'A data da destinação é inválida ou está no futuro'],
      ['data invalida', { date: 'ontem' }, 'A data da destinação é inválida ou está no futuro'],
    ])('rejeita (400): %s', async (_label, override, message) => {
      const wasteTypeId = await createWasteType();

      const res = await request(app.getHttpServer())
        .post('/waste-lots')
        .set(GESTOR)
        .send(disposalBody(wasteTypeId, override))
        .expect(400);
      expect(res.body.message).toBe(message);
    });

    it('rejeita tipo de residuo que nao existe (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/waste-lots')
        .set(GESTOR)
        .send(disposalBody('9b2c1b36-7d4e-4f0a-8a55-1c2d3e4f5a6b'))
        .expect(400);
      expect(res.body.message).toBe('Tipo de resíduo não encontrado');
    });

    it('rejeita corpo vazio (400)', async () => {
      await request(app.getHttpServer()).post('/waste-lots').set(GESTOR).send({}).expect(400);
    });
  });

  describe('permissoes por perfil (RBAC)', () => {
    it.each(['administrador', 'operador', 'diretoria'])(
      '%s nao pode registrar destinacao (403)',
      async (role) => {
        const wasteTypeId = await createWasteType();
        await request(app.getHttpServer())
          .post('/waste-lots')
          .set({ 'x-test-roles': role })
          .send(disposalBody(wasteTypeId))
          .expect(403);
      },
    );

    it.each(['gestor-ambiental', 'diretoria'])('%s pode consultar os lotes', async (role) => {
      await request(app.getHttpServer())
        .get('/waste-lots')
        .set({ 'x-test-roles': role })
        .expect(200);
    });

    it.each(['administrador', 'operador'])('%s nao pode consultar os lotes (403)', async (role) => {
      await request(app.getHttpServer())
        .get('/waste-lots')
        .set({ 'x-test-roles': role })
        .expect(403);
    });

    it('usuario sem nenhum papel conhecido e barrado (403)', async () => {
      await request(app.getHttpServer()).get('/waste-lots').expect(403);
    });
  });
});
