/**
 * Utilitarios de PKCE (RFC 7636) para o fluxo authorization code + PKCE.
 * Parte de core/ — sem dependencia de UI. Usa Web Crypto (disponivel no browser).
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/** Gera um code_verifier aleatorio (43-128 chars) conforme a RFC 7636. */
export function generateCodeVerifier(length = 64): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) {
    out += CHARS[b % CHARS.length];
  }
  return out;
}

/** Codifica ArrayBuffer em base64url (sem padding). */
export function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Deriva o code_challenge (S256) a partir do code_verifier. */
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}
