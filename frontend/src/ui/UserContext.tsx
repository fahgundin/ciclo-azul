import { createContext, useContext, type ReactNode } from 'react';
import type { TokenUser } from '../core/auth/token';

const UserContext = createContext<TokenUser | null>(null);

/** Disponibiliza o usuario autenticado para as paginas (ex.: "gerado por" nos relatorios). */
export function UserProvider({
  user,
  children,
}: {
  user: TokenUser;
  children: ReactNode;
}): JSX.Element {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Usuario autenticado; `null` fora de um UserProvider. */
export function useUser(): TokenUser | null {
  return useContext(UserContext);
}
