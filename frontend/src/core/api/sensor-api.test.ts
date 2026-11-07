import { afterEach, describe, it, expect, vi } from 'vitest';
import { ApiError } from './api-error';
import { SensorApi } from './sensor-api';

function mockFetch(response: { ok: boolean; status?: number; json: () => unknown }) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 400),
    json: async () => response.json(),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('SensorApi (core)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lista os sensores enviando o token Bearer', async () => {
    const fetchFn = mockFetch({
      ok: true,
      json: () => [
        {
          sensorId: 'sn-01',
          unitId: 'dc-sp1',
          status: 'connected',
          linkedAt: '2026-11-05T10:00:00Z',
        },
      ],
    });
    const api = new SensorApi('http://api', () => 'tok-1');

    const sensors = await api.list();

    expect(sensors).toHaveLength(1);
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api/sensors');
    expect(options.headers.Authorization).toBe('Bearer tok-1');
  });

  it('nao envia Authorization sem token', async () => {
    const fetchFn = mockFetch({ ok: true, json: () => [] });
    await new SensorApi('http://api', () => null).list();
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('vincula um sensor com POST /sensors e corpo JSON', async () => {
    const fetchFn = mockFetch({
      ok: true,
      status: 201,
      json: () => ({
        sensorId: 'sn-02',
        unitId: 'dc-sp1',
        status: 'connected',
        linkedAt: '2026-11-05T10:00:00Z',
      }),
    });
    const api = new SensorApi('http://api', () => 'tok');

    const sensor = await api.link({ sensorId: 'sn-02', unitId: 'dc-sp1' });

    expect(sensor.sensorId).toBe('sn-02');
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api/sensors');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ sensorId: 'sn-02', unitId: 'dc-sp1' });
  });

  it('propaga a mensagem exata do backend em 409 (sensor ja vinculado)', async () => {
    mockFetch({
      ok: false,
      status: 409,
      json: () => ({ message: 'O sensor sn-02 já está vinculado a uma unidade' }),
    });
    const api = new SensorApi('http://api', () => 'tok');

    const error = await api.link({ sensorId: 'sn-02', unitId: 'dc-sp1' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: 'O sensor sn-02 já está vinculado a uma unidade',
      status: 409,
    });
  });

  it('junta mensagens quando o backend devolve uma lista', async () => {
    mockFetch({ ok: false, status: 400, json: () => ({ message: ['a', 'b'] }) });
    await expect(new SensorApi('http://api', () => 'tok').list()).rejects.toMatchObject({
      message: 'a, b',
    });
  });

  it('usa mensagem padrao quando o erro nao tem corpo JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('sem json');
        },
      }),
    );
    await expect(new SensorApi('http://api', () => 'tok').list()).rejects.toMatchObject({
      message: 'Erro 502',
      status: 502,
    });
  });
});
