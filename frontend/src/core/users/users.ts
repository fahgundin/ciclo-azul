import { APP_ROLES, type AppRole } from '../auth/roles';
import type { FieldErrors } from '../forms';

/**
 * Gestao de usuarios e perfis (R01 / HU01) — core/, agnostico de UI.
 *
 * ADAPTER EM MEMORIA: o backend NAO tem endpoint de usuarios (R01, #11, em aberto) e
 * os usuarios reais vivem no Keycloak (login, senha e roles). O `UserDirectory` aqui e
 * um cadastro de DEMONSTRACAO (semeado do prototipo), por sessao de login: criar ou
 * editar um usuario NAO cria conta nem altera o perfil no Keycloak e some ao recarregar.
 * Quando houver endpoint (ou uso da Admin API do Keycloak pelo backend), troque so o
 * adapter. Ver docs/migracao-frontend.md.
 */

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  active: boolean;
  /** Unidades sob responsabilidade; so faz sentido para o Operador (RN03). */
  unitIds: string[];
}

export interface NewUserInput {
  name: string;
  email: string;
  role: AppRole;
  unitIds: string[];
}

export interface UserChanges {
  role: AppRole;
  active: boolean;
  unitIds: string[];
}

/** Porta do cadastro de usuarios (hoje em memoria; amanha, a API). */
export interface UserDirectory {
  list(): ManagedUser[];
  create(input: NewUserInput): ManagedUser;
  update(id: string, changes: UserChanges): ManagedUser;
}

/** Cadastro de demonstracao (do prototipo). */
export const SEED_USERS: readonly ManagedUser[] = [
  {
    id: 'u-ana',
    name: 'Ana Souza',
    email: 'ana@ciclo.azul',
    role: APP_ROLES.ADMINISTRADOR,
    active: true,
    unitIds: [],
  },
  {
    id: 'u-marina',
    name: 'Marina Costa',
    email: 'marina@ciclo.azul',
    role: APP_ROLES.GESTOR_AMBIENTAL,
    active: true,
    unitIds: [],
  },
  {
    id: 'u-rafael',
    name: 'Rafael Lima',
    email: 'rafael@ciclo.azul',
    role: APP_ROLES.GESTOR_AMBIENTAL,
    active: true,
    unitIds: [],
  },
  {
    id: 'u-diego',
    name: 'Diego Alves',
    email: 'diego@ciclo.azul',
    role: APP_ROLES.OPERADOR,
    active: true,
    unitIds: ['dc-sp1', 'dc-cps'],
  },
  {
    id: 'u-paulo',
    name: 'Paulo Nunes',
    email: 'paulo@ciclo.azul',
    role: APP_ROLES.OPERADOR,
    active: true,
    unitIds: ['dc-for'],
  },
  {
    id: 'u-helena',
    name: 'Helena Prado',
    email: 'helena@ciclo.azul',
    role: APP_ROLES.DIRETORIA,
    active: true,
    unitIds: [],
  },
];

const copy = (user: ManagedUser): ManagedUser => ({ ...user, unitIds: [...user.unitIds] });

/** Unidades so valem para o Operador: para os demais perfis a lista e sempre vazia. */
const unitsFor = (role: AppRole, unitIds: readonly string[]): string[] =>
  role === APP_ROLES.OPERADOR ? [...unitIds] : [];

/** ADAPTER EM MEMORIA do cadastro de usuarios (perde tudo ao recarregar). */
export class InMemoryUserDirectory implements UserDirectory {
  private users: ManagedUser[];
  private counter = 0;

  constructor(seed: readonly ManagedUser[] = SEED_USERS) {
    this.users = seed.map(copy);
  }

  list(): ManagedUser[] {
    return this.users.map(copy);
  }

  create(input: NewUserInput): ManagedUser {
    this.counter += 1;
    const user: ManagedUser = {
      id: `u-novo-${this.counter}`,
      name: input.name.trim(),
      email: normalizeEmail(input.email),
      role: input.role,
      active: true,
      unitIds: unitsFor(input.role, input.unitIds),
    };
    this.users = [...this.users, user];
    return copy(user);
  }

  update(id: string, changes: UserChanges): ManagedUser {
    const current = this.users.find((user) => user.id === id);
    if (!current) {
      throw new Error(`Usuário ${id} não encontrado`);
    }
    const updated: ManagedUser = {
      ...current,
      role: changes.role,
      active: changes.active,
      unitIds: unitsFor(changes.role, changes.unitIds),
    };
    this.users = this.users.map((user) => (user.id === id ? updated : user));
    return copy(updated);
  }
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export const OPERATOR_UNITS_MESSAGE = 'Selecione ao menos uma unidade para o Operador.';

export type NewUserField = 'name' | 'email' | 'units';

/** Valida o cadastro de um novo usuario (nome, e-mail unico e unidade do Operador). */
export function validateNewUser(
  input: NewUserInput,
  existing: readonly ManagedUser[],
): FieldErrors<NewUserField> {
  const errors: FieldErrors<NewUserField> = {};
  if (!input.name.trim()) {
    errors.name = 'Informe o nome completo.';
  }
  const email = normalizeEmail(input.email);
  if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Informe um e-mail válido.';
  } else if (existing.some((user) => normalizeEmail(user.email) === email)) {
    errors.email = 'Já existe um usuário com este e-mail.';
  }
  if (input.role === APP_ROLES.OPERADOR && input.unitIds.length === 0) {
    errors.units = OPERATOR_UNITS_MESSAGE;
  }
  return errors;
}

/** E o proprio usuario logado? (compara pelo e-mail, que e o que o token traz) */
export function isSelf(user: Pick<ManagedUser, 'email'>, currentEmail: string | null): boolean {
  return currentEmail !== null && normalizeEmail(user.email) === normalizeEmail(currentEmail);
}

export type UserChangeField = 'units';

/**
 * Valida a edicao. Regras: ninguem altera o PROPRIO nivel de acesso nem desativa a
 * propria conta (`self`), e o Operador precisa de ao menos uma unidade.
 */
export function validateUserChanges(
  user: ManagedUser,
  changes: UserChanges,
  self: boolean,
): FieldErrors<UserChangeField> {
  const errors: FieldErrors<UserChangeField> = {};
  const role = self ? user.role : changes.role;
  if (role === APP_ROLES.OPERADOR && changes.unitIds.length === 0) {
    errors.units = OPERATOR_UNITS_MESSAGE;
  }
  return errors;
}

/** Aplica a regra do proprio usuario: nivel e status ficam como estao. */
export function effectiveChanges(
  user: ManagedUser,
  changes: UserChanges,
  self: boolean,
): UserChanges {
  return self ? { ...changes, role: user.role, active: user.active } : changes;
}
