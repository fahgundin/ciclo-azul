import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { WasteManagementModule } from '../waste-management.module';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/roles.guard';

/**
 * Testes do controller de tipos de residuo cobrindo os cenarios Gherkin de R07.
 * Os guards de auth (testados na F3) sao sobrescritos para liberar as rotas e
 * focar no comportamento do endpoint.
 */
describe('WasteTypeController (R07)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WasteManagementModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Cenario: Cadastrar um novo tipo de residuo
  it('cadastra um tipo com classificacao e o deixa disponivel na listagem', async () => {
    const create = await request(app.getHttpServer())
      .post('/waste-types')
      .send({ name: 'Óleo de refrigeração', classification: 'Metal pesado' })
      .expect(201);

    expect(create.body).toMatchObject({
      name: 'Óleo de refrigeração',
      classification: 'Metal pesado',
    });
    expect(create.body.id).toBeTruthy();

    const list = await request(app.getHttpServer()).get('/waste-types').expect(200);
    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Óleo de refrigeração', classification: 'Metal pesado' }),
      ]),
    );
  });

  // Cenario: Impedir cadastro sem classificacao
  it('bloqueia cadastro sem classificacao com a mensagem exata e status 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/waste-types')
      .send({ name: 'Óleo de refrigeração', classification: '' })
      .expect(400);

    expect(res.body.message).toBe('A classificação do resíduo é obrigatória');
  });
});
