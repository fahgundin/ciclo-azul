import { useId, useState, type FormEvent } from 'react';
import { APP_ROLES, ROLE_LABELS, type AppRole } from '../../core/auth/roles';
import {
  effectiveChanges,
  validateNewUser,
  validateUserChanges,
  type ManagedUser,
  type UserChanges,
  type NewUserInput,
} from '../../core/users/users';
import { Icon } from '../components/Icon';

const ROLES = Object.values(APP_ROLES);

interface UserFormProps {
  /** Usuario em edicao; `null` = novo usuario. */
  user: ManagedUser | null;
  /** O usuario editado e quem esta logado (nao pode mudar o proprio nivel nem se desativar). */
  self: boolean;
  /** Unidades que podem ser atribuidas ao Operador. */
  units: readonly string[];
  /** Cadastro atual (para impedir e-mail repetido). */
  existing: readonly ManagedUser[];
  onCreate: (input: NewUserInput) => void;
  onUpdate: (id: string, changes: UserChanges) => void;
  onClose: () => void;
}

/**
 * Formulario de usuario (R01): novo usuario (nome, e-mail, nivel de acesso, unidades
 * para o Operador) ou edicao (nivel, status e unidades). O nome e o e-mail nao sao
 * editaveis: pertencem ao cadastro do Keycloak.
 */
export function UserForm({
  user,
  self,
  units,
  existing,
  onCreate,
  onUpdate,
  onClose,
}: UserFormProps): JSX.Element {
  const idPrefix = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>(user?.role ?? APP_ROLES.OPERADOR);
  const [active, setActive] = useState(user?.active ?? true);
  const [unitIds, setUnitIds] = useState<string[]>(user?.unitIds ?? []);
  const [errors, setErrors] = useState<{ name?: string; email?: string; units?: string }>({});

  const lockedRole = user !== null && self;
  const shownRole = lockedRole ? user.role : role;

  function toggleUnit(unitId: string, checked: boolean): void {
    setUnitIds((current) =>
      checked ? [...current, unitId] : current.filter((id) => id !== unitId),
    );
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (user === null) {
      const input: NewUserInput = { name, email, role, unitIds };
      const found = validateNewUser(input, existing);
      setErrors(found);
      if (Object.keys(found).length === 0) {
        onCreate(input);
      }
      return;
    }
    const changes: UserChanges = { role, active, unitIds };
    const found = validateUserChanges(user, changes, self);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      onUpdate(user.id, effectiveChanges(user, changes, self));
    }
  }

  const nameField = `${idPrefix}-name`;
  const emailField = `${idPrefix}-email`;
  const roleField = `${idPrefix}-role`;

  return (
    <form
      className="form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={user ? `Editar ${user.name}` : 'Novo usuário'}
    >
      {user === null ? (
        <>
          <div className="field">
            <label htmlFor={nameField}>Nome completo</label>
            <input
              id={nameField}
              className="field__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? `${nameField}-error` : undefined}
            />
            {errors.name && (
              <p className="field__error" id={`${nameField}-error`}>
                <Icon name="alert" size={16} />
                {errors.name}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor={emailField}>E-mail</label>
            <input
              id={emailField}
              className="field__input"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? `${emailField}-error` : undefined}
            />
            {errors.email && (
              <p className="field__error" id={`${emailField}-error`}>
                <Icon name="alert" size={16} />
                {errors.email}
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="muted">{user.email}</p>
      )}

      <div className="field">
        <label htmlFor={roleField}>Nível de acesso</label>
        <select
          id={roleField}
          className="field__input"
          value={shownRole}
          disabled={lockedRole}
          onChange={(e) => setRole(e.target.value as AppRole)}
        >
          {ROLES.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {shownRole === APP_ROLES.OPERADOR && (
        <fieldset className="field units-field">
          <legend>Unidades sob responsabilidade</legend>
          {units.length === 0 ? (
            <p className="hint">
              Nenhuma unidade conhecida ainda (ainda não há sensores ou leituras).
            </p>
          ) : (
            units.map((unitId) => (
              <label key={unitId} className="check">
                <input
                  type="checkbox"
                  checked={unitIds.includes(unitId)}
                  onChange={(e) => toggleUnit(unitId, e.target.checked)}
                />
                {unitId}
              </label>
            ))
          )}
          <p className="hint">
            Cadastro de referência: o backend ainda não restringe alertas nem leituras por unidade.
          </p>
          {errors.units && (
            <p className="field__error">
              <Icon name="alert" size={16} />
              {errors.units}
            </p>
          )}
        </fieldset>
      )}

      {user !== null && (
        <label className="check">
          <input
            type="checkbox"
            checked={lockedRole ? user.active : active}
            disabled={self}
            onChange={(e) => setActive(e.target.checked)}
          />
          Conta ativa
        </label>
      )}

      {self && (
        <p className="hint">
          Você não pode alterar o próprio nível de acesso nem desativar a própria conta.
        </p>
      )}

      <div className="actions">
        <button type="submit" className="btn btn--primary">
          {user ? 'Salvar alterações' : 'Criar usuário'}
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
