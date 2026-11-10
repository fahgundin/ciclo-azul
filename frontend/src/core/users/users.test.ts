import { describe, it, expect } from 'vitest';
import { APP_ROLES } from '../auth/roles';
import {
  InMemoryUserDirectory,
  OPERATOR_UNITS_MESSAGE,
  SEED_USERS,
  effectiveChanges,
  isSelf,
  validateNewUser,
  validateUserChanges,
  type ManagedUser,
} from './users';

const diego = SEED_USERS.find((u) => u.id === 'u-diego') as ManagedUser;
const ana = SEED_USERS.find((u) => u.id === 'u-ana') as ManagedUser;

describe('InMemoryUserDirectory', () => {
  it('comeca com o cadastro de demonstracao, sem expor o estado interno', () => {
    const directory = new InMemoryUserDirectory();
    expect(directory.list()).toHaveLength(SEED_USERS.length);
    directory.list()[0]!.name = 'Alterado de fora';
    directory
      .list()
      .find((u) => u.id === 'u-diego')!
      .unitIds.push('x');
    expect(directory.list()[0]?.name).toBe(SEED_USERS[0]?.name);
    expect(directory.list().find((u) => u.id === 'u-diego')?.unitIds).toEqual(['dc-sp1', 'dc-cps']);
  });

  // HU01, cenario "Criar um novo usuario com perfil definido"
  it('cria o usuario ativo, com o perfil informado e e-mail normalizado', () => {
    const directory = new InMemoryUserDirectory();
    const created = directory.create({
      name: '  Carla Dias ',
      email: ' Carla@Ciclo.Azul ',
      role: APP_ROLES.OPERADOR,
      unitIds: ['dc-for'],
    });
    expect(created).toMatchObject({
      name: 'Carla Dias',
      email: 'carla@ciclo.azul',
      role: 'operador',
      active: true,
      unitIds: ['dc-for'],
    });
    expect(directory.list().map((u) => u.id)).toContain(created.id);
  });

  it('unidades so valem para o Operador: outros perfis ficam sem unidades', () => {
    const directory = new InMemoryUserDirectory();
    const created = directory.create({
      name: 'Gil',
      email: 'gil@ciclo.azul',
      role: APP_ROLES.GESTOR_AMBIENTAL,
      unitIds: ['dc-sp1'],
    });
    expect(created.unitIds).toEqual([]);
  });

  it('atualiza nivel, status e unidades; ao sair de Operador as unidades somem', () => {
    const directory = new InMemoryUserDirectory();
    const updated = directory.update('u-diego', {
      role: APP_ROLES.DIRETORIA,
      active: false,
      unitIds: ['dc-sp1'],
    });
    expect(updated).toMatchObject({ role: 'diretoria', active: false, unitIds: [] });
    expect(directory.list().find((u) => u.id === 'u-diego')).toEqual(updated);
  });

  it('atualizar usuario inexistente falha', () => {
    expect(() =>
      new InMemoryUserDirectory().update('nao-existe', {
        role: APP_ROLES.OPERADOR,
        active: true,
        unitIds: ['a'],
      }),
    ).toThrow(/não encontrado/);
  });
});

describe('validateNewUser', () => {
  const valid = {
    name: 'Carla Dias',
    email: 'carla@ciclo.azul',
    role: APP_ROLES.DIRETORIA,
    unitIds: [],
  };

  it('aceita um cadastro valido', () => {
    expect(validateNewUser(valid, SEED_USERS)).toEqual({});
  });

  it('exige nome', () => {
    expect(validateNewUser({ ...valid, name: '  ' }, SEED_USERS).name).toBe(
      'Informe o nome completo.',
    );
  });

  it.each(['', 'sem-arroba', 'a@b', 'a b@c.de'])('recusa e-mail invalido (%j)', (email) => {
    expect(validateNewUser({ ...valid, email }, SEED_USERS).email).toBe(
      'Informe um e-mail válido.',
    );
  });

  it('recusa e-mail ja cadastrado, ignorando maiusculas e espacos', () => {
    expect(validateNewUser({ ...valid, email: ' ANA@ciclo.azul ' }, SEED_USERS).email).toBe(
      'Já existe um usuário com este e-mail.',
    );
  });

  it('Operador precisa de ao menos uma unidade; os outros perfis nao', () => {
    expect(validateNewUser({ ...valid, role: APP_ROLES.OPERADOR }, SEED_USERS).units).toBe(
      OPERATOR_UNITS_MESSAGE,
    );
    expect(
      validateNewUser({ ...valid, role: APP_ROLES.OPERADOR, unitIds: ['dc-sp1'] }, SEED_USERS),
    ).toEqual({});
  });
});

describe('edicao de usuario', () => {
  it('reconhece o proprio usuario pelo e-mail', () => {
    expect(isSelf(ana, 'ANA@ciclo.azul')).toBe(true);
    expect(isSelf(ana, 'outro@ciclo.azul')).toBe(false);
    expect(isSelf(ana, null)).toBe(false);
  });

  it('Operador editado precisa manter ao menos uma unidade', () => {
    const errors = validateUserChanges(
      diego,
      { role: APP_ROLES.OPERADOR, active: true, unitIds: [] },
      false,
    );
    expect(errors.units).toBe(OPERATOR_UNITS_MESSAGE);
  });

  it('mudar o perfil para um que nao e Operador dispensa unidades', () => {
    expect(
      validateUserChanges(diego, { role: APP_ROLES.DIRETORIA, active: true, unitIds: [] }, false),
    ).toEqual({});
  });

  it('ninguem altera o proprio nivel nem se desativa: a mudanca e ignorada', () => {
    const changes = { role: APP_ROLES.DIRETORIA, active: false, unitIds: [] };
    expect(effectiveChanges(ana, changes, true)).toEqual({
      role: APP_ROLES.ADMINISTRADOR,
      active: true,
      unitIds: [],
    });
    expect(effectiveChanges(ana, changes, false)).toEqual(changes);
  });

  it('a regra de unidade do Operador usa o nivel que de fato vale para o proprio usuario', () => {
    // Operador logado tentando virar Diretoria: continua Operador, entao precisa de unidade.
    const errors = validateUserChanges(
      diego,
      { role: APP_ROLES.DIRETORIA, active: true, unitIds: [] },
      true,
    );
    expect(errors.units).toBe(OPERATOR_UNITS_MESSAGE);
  });
});
