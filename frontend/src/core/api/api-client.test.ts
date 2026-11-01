import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiClient } from './api-client';

describe('ApiClient (core)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna o status de saude do backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      }),
    );

    const client = new ApiClient('http://localhost:3000');
    await expect(client.getHealth()).resolves.toEqual({ status: 'ok' });
  });

  it('lanca erro quando a resposta nao e ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const client = new ApiClient('http://localhost:3000');
    await expect(client.getHealth()).rejects.toThrow('503');
  });
});
