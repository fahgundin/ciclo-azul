import { useEffect, useState } from 'react';
import type { WaterStatusApi } from '../../core/api/water-status-api';
import {
  PERMISSION_LABELS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type Permission,
} from '../../core/auth/permissions';
import { APP_ROLES, ROLE_LABELS } from '../../core/auth/roles';
import { isSelf, type UserDirectory } from '../../core/users/users';
import { useFlash } from '../components/Flash';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import '../styles/components.css';
import '../styles/users.css';
import { useUser } from '../UserContext';
import { UserForm } from './UserForm';

interface UsersPageProps {
  /** ADAPTER EM MEMORIA do cadastro de usuarios (R01). */
  directory: UserDirectory;
  statusApi: Pick<WaterStatusApi, 'list'>;
}

const ROLES = Object.values(APP_ROLES);
const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

/**
 * Gestao de usuarios e perfis (R01 / HU01) — somente Administrador.
 *
 * ADAPTER EM MEMORIA / CADASTRO DE DEMONSTRACAO: os usuarios reais, suas senhas e roles
 * ficam no Keycloak; o backend nao tem endpoint de usuarios. Criar ou editar aqui NAO cria
 * conta nem muda o perfil no Keycloak (ver docs/migracao-frontend.md). A matriz de
 * permissoes e somente leitura e so descreve o que a interface mostra a cada perfil.
 */
export function UsersPage({ directory, statusApi }: UsersPageProps): JSX.Element {
  const flash = useFlash();
  const me = useUser();
  const [, setVersion] = useState(0);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [knownUnits, setKnownUnits] = useState<string[]>([]);
  const [unitsError, setUnitsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    statusApi
      .list()
      .then((statuses) => {
        if (!cancelled) {
          setKnownUnits(statuses.map((s) => s.unitId));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnitsError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [statusApi]);

  const users = directory.list();
  const units = [...new Set([...knownUnits, ...users.flatMap((u) => u.unitIds)])].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
  const editingUser = editing && editing !== 'new' ? users.find((u) => u.id === editing) : null;

  function close(): void {
    setEditing(null);
  }

  return (
    <section className="page">
      <h1>Usuários e perfis</h1>

      <p className="hint">
        Cadastro de demonstração (adapter em memória): as contas, senhas e perfis reais ficam no
        Keycloak, e o backend ainda não tem endpoint de usuários (R01). Criar ou editar aqui não
        cria conta nem altera o perfil no Keycloak, e some ao recarregar.
      </p>

      <div className="actions">
        <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
          <Icon name="plus" />
          Novo usuário
        </button>
      </div>

      <section className="page__section" aria-labelledby="users-title">
        <h2 id="users-title">Usuários</h2>
        <ul className="glass list" aria-label="Usuários">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                className="user-row"
                aria-label={`Editar ${user.name}`}
                onClick={() => setEditing(user.id)}
              >
                <span className="item__title">
                  {user.name}
                  {isSelf(user, me?.email ?? null) ? ' (você)' : ''}
                </span>
                <span className="item__meta">{user.email}</span>
                {user.unitIds.length > 0 && (
                  <span className="item__meta">Unidades: {user.unitIds.join(', ')}</span>
                )}
                <span className="user-row__tags">
                  <span className="tag">{ROLE_LABELS[user.role]}</span>
                  {!user.active && <span className="tag tag--warn">Inativo</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="page__section" aria-labelledby="matrix-title">
        <h2 id="matrix-title">Permissões por nível de acesso</h2>
        <div className="glass table-wrap">
          <table className="matrix">
            <caption className="hint">Somente leitura</caption>
            <thead>
              <tr>
                <th scope="col">Permissão</th>
                {ROLES.map((role) => (
                  <th key={role} scope="col">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((permission) => (
                <tr key={permission}>
                  <th scope="row">{PERMISSION_LABELS[permission]}</th>
                  {ROLES.map((role) => {
                    const granted = ROLE_PERMISSIONS[role].includes(permission);
                    return (
                      <td key={role} aria-label={granted ? 'Sim' : 'Não'}>
                        {granted ? <Icon name="check" size={16} /> : '–'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          O nível de acesso define o que a interface mostra a cada pessoa. A regra definitiva é
          aplicada pela API em cada rota.
        </p>
      </section>

      <Dialog open={editing === 'new'} title="Novo usuário" onClose={close}>
        <UserForm
          user={null}
          self={false}
          units={units}
          existing={users}
          onCreate={(input) => {
            directory.create(input);
            setVersion((v) => v + 1);
            flash('Usuário criado.');
            close();
          }}
          onUpdate={() => undefined}
          onClose={close}
        />
        {unitsError && (
          <p className="hint">
            Não foi possível carregar as unidades; só as já atribuídas aparecem.
          </p>
        )}
      </Dialog>

      <Dialog open={editingUser != null} title={editingUser?.name ?? 'Usuário'} onClose={close}>
        {editingUser && (
          <UserForm
            user={editingUser}
            self={isSelf(editingUser, me?.email ?? null)}
            units={units}
            existing={users}
            onCreate={() => undefined}
            onUpdate={(id, changes) => {
              directory.update(id, changes);
              setVersion((v) => v + 1);
              flash('Usuário atualizado.');
              close();
            }}
            onClose={close}
          />
        )}
      </Dialog>
    </section>
  );
}
