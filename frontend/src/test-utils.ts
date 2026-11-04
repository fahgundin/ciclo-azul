/**
 * Utilitarios compartilhados pelos testes (nao entram no bundle de producao).
 */

/** Codifica em base64url (sem padding), como num JWT real. */
function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Fabrica um access token JWT NAO assinado, so com as claims informadas. */
export function makeToken(claims: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  return `${header}.${base64Url(JSON.stringify(claims))}.assinatura`;
}

/** Token de um usuario com os roles de realm informados. */
export function makeTokenWithRoles(roles: string[], extra: Record<string, unknown> = {}): string {
  return makeToken({ realm_access: { roles }, ...extra });
}
