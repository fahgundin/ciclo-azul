import { describe, it, expect, vi, afterEach } from 'vitest';
import { WasteTypeApi } from './waste-type-api';
import { ApiError } from './api-error';

function mockFetch(response: { ok: boolean; status?: number; json: () => unknown }) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 400),
    json: async () => response.json(),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('WasteTypeApi (core)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lista tipos enviando o token Bearer', async () => {
    const fetchFn = mockFetch({
      ok: true,
      json: () => [{ id: '1', name: 'Óleo', classification: 'Metal pesado' }],
    });
    const api = new WasteTypeApi('http://localhost:3000', () => 'tok-123');

    const result = await api.list();

    expect(result).toHaveLength(1);
    const [, options] = fetchFn.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer tok-123');
  });

  it('cria um tipo e retorna a representacao', async () => {
    mockFetch({
      ok: true,
      status: 201,
      json: () => ({ id: '2', name: 'Solvente', classification: 'Químico' }),
    });
    const api = new WasteTypeApi('http://localhost:3000', () => 'tok');

    const created = await api.create({ name: 'Solvente', classification: 'Químico' });
    expect(created).toMatchObject({ name: 'Solvente', classification: 'Químico' });
  });

  it('lanca ApiError com a mensagem exata quando falta classificacao (400)', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: () => ({ message: 'A classificação do resíduo é obrigatória' }),
    });
    const api = new WasteTypeApi('http://localhost:3000', () => 'tok');

    await expect(api.create({ name: 'Óleo', classification: '' })).rejects.toMatchObject({
      message: 'A classificação do resíduo é obrigatória',
      status: 400,
    });
    await expect(api.create({ name: 'Óleo', classification: '' })).rejects.toBeInstanceOf(ApiError);
  });
});
