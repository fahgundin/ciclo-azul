import { afterEach, describe, it, expect, vi } from 'vitest';
import { WaterStatusApi } from './water-status-api';

describe('WaterStatusApi (core)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lista o estado das unidades enviando o token Bearer', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          unitId: 'dc-sp1',
          state: 'live',
          currentValueInLiters: 12,
          lastReadingAt: '2026-11-07T12:00:00.000Z',
          lastReadingType: 'sensor',
          staleAfterMinutes: 15,
        },
      ],
    });
    vi.stubGlobal('fetch', fetchFn);

    const statuses = await new WaterStatusApi('http://api', () => 'tok').list();

    expect(statuses[0]?.unitId).toBe('dc-sp1');
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api/water-status');
    expect(options.headers.Authorization).toBe('Bearer tok');
  });

  it('propaga o erro do backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: 'Proibido' }) }),
    );
    await expect(new WaterStatusApi('http://api', () => 'tok').list()).rejects.toMatchObject({
      message: 'Proibido',
      status: 403,
    });
  });
});
