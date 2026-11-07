import { afterEach, describe, it, expect, vi } from 'vitest';
import { WaterReadingApi } from './water-reading-api';

function mockFetch(response: { ok: boolean; status?: number; json: () => unknown }) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 400),
    json: async () => response.json(),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('WaterReadingApi (core)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lanca leitura manual com POST /water-readings/manual', async () => {
    const fetchFn = mockFetch({
      ok: true,
      status: 201,
      json: () => ({
        sensorId: 'manual',
        unitId: 'dc-for',
        timestamp: '2026-11-05T00:00:00.000Z',
        valueInLiters: 96,
        readingType: 'manual',
      }),
    });
    const api = new WaterReadingApi('http://api', () => 'tok');

    const reading = await api.registerManual({
      unitId: 'dc-for',
      valueInLiters: 96,
      date: '2026-11-05',
    });

    expect(reading.readingType).toBe('manual');
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api/water-readings/manual');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(options.body)).toEqual({
      unitId: 'dc-for',
      valueInLiters: 96,
      date: '2026-11-05',
    });
  });

  it('consulta o historico por unidade com a unidade codificada na URL', async () => {
    const fetchFn = mockFetch({ ok: true, json: () => [] });
    await new WaterReadingApi('http://api', () => 'tok').listByUnit('dc sp/1');
    expect(fetchFn.mock.calls[0][0]).toBe('http://api/water-readings?unitId=dc%20sp%2F1');
  });

  it('propaga a mensagem do backend quando a unidade tem sensor (409)', async () => {
    mockFetch({
      ok: false,
      status: 409,
      json: () => ({
        message: 'A unidade dc-sp1 possui sensor conectado: leitura manual não é permitida',
      }),
    });
    const api = new WaterReadingApi('http://api', () => 'tok');

    await expect(
      api.registerManual({ unitId: 'dc-sp1', valueInLiters: 10, date: '2026-11-05' }),
    ).rejects.toMatchObject({
      message: 'A unidade dc-sp1 possui sensor conectado: leitura manual não é permitida',
      status: 409,
    });
  });
});
