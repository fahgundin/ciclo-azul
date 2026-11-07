import { afterEach, describe, it, expect, vi } from 'vitest';
import { WasteLotApi } from './waste-lot-api';

function mockFetch(response: { ok: boolean; status?: number; json: () => unknown }) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 400),
    json: async () => response.json(),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const INPUT = {
  wasteTypeId: 'wt-1',
  location: 'Paulínia/SP',
  receiverCompany: 'EcoQuímica Ambiental',
  license: 'LO-2043/2025',
  date: '2026-11-05',
  quantity: 800,
  proofReference: 'mtr-0140.pdf',
};

describe('WasteLotApi (core)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lista os lotes enviando o token Bearer', async () => {
    const fetchFn = mockFetch({ ok: true, json: () => [] });
    await new WasteLotApi('http://api', () => 'tok-1').list();

    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api/waste-lots');
    expect(options.headers.Authorization).toBe('Bearer tok-1');
  });

  it('registra a destinacao com POST /waste-lots e corpo JSON', async () => {
    const fetchFn = mockFetch({
      ok: true,
      status: 201,
      json: () => ({ id: 'l-1', ...INPUT, date: '2026-11-05T00:00:00.000Z', status: 'destined' }),
    });
    const lot = await new WasteLotApi('http://api', () => 'tok').register(INPUT);

    expect(lot.status).toBe('destined');
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api/waste-lots');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(INPUT);
  });

  it('propaga a mensagem exata quando falta o comprovante (400)', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: () => ({ message: 'O comprovante de destinação é obrigatório' }),
    });
    await expect(
      new WasteLotApi('http://api', () => 'tok').register({ ...INPUT, proofReference: '' }),
    ).rejects.toMatchObject({
      message: 'O comprovante de destinação é obrigatório',
      status: 400,
    });
  });
});
