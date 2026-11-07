import { afterEach, describe, expect, it, vi } from 'vitest';
import { base64UrlEncode, deriveCodeChallenge, generateCodeVerifier, sha256 } from './pkce';

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('sha256 (alternativa sem Web Crypto)', () => {
  // Vetores de teste do NIST (FIPS 180-4).
  it('calcula o hash da mensagem vazia', () => {
    expect(hex(sha256(utf8('')))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('calcula o hash de "abc"', () => {
    expect(hex(sha256(utf8('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('calcula o hash de uma mensagem de dois blocos (448 bits)', () => {
    expect(hex(sha256(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('coincide com o Web Crypto para entradas de varios tamanhos', async () => {
    // 55, 56 e 64 bytes sao as fronteiras do preenchimento (padding) do SHA-256.
    for (const length of [1, 55, 56, 63, 64, 65, 119, 120, 1000]) {
      const data = new Uint8Array(length).map((_, i) => (i * 7 + 3) % 256);
      const expected = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
      expect(hex(sha256(data))).toBe(hex(expected));
    }
  });
});

describe('deriveCodeChallenge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Exemplo do Apendice B da RFC 7636.
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

  it('deriva o challenge S256 com o Web Crypto', async () => {
    expect(await deriveCodeChallenge(verifier)).toBe(challenge);
  });

  it('deriva o mesmo challenge quando crypto.subtle nao existe (http fora de localhost)', async () => {
    vi.stubGlobal('crypto', { subtle: undefined });
    expect(await deriveCodeChallenge(verifier)).toBe(challenge);
  });
});

describe('base64UrlEncode', () => {
  it('codifica sem padding e com alfabeto url-safe', () => {
    expect(base64UrlEncode(new Uint8Array([0xfb, 0xff, 0xfe]))).toBe('-__-');
    expect(base64UrlEncode(new Uint8Array([1]))).toBe('AQ');
  });

  it('aceita ArrayBuffer e Uint8Array com o mesmo resultado', () => {
    const bytes = new Uint8Array([1, 2, 3, 250]);
    expect(base64UrlEncode(bytes.buffer)).toBe(base64UrlEncode(bytes));
  });
});

describe('generateCodeVerifier', () => {
  it('gera o tamanho pedido apenas com caracteres permitidos pela RFC 7636', () => {
    const verifier = generateCodeVerifier(64);
    expect(verifier).toHaveLength(64);
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });
});
