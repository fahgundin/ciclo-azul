import { describe, it, expect, vi } from 'vitest';
import { ApiError } from '../api/api-error';
import { ApiReportDataSource } from './report-data-source';

const sensor = (sensorId: string, unitId: string) => ({
  sensorId,
  unitId,
  status: 'connected' as const,
  linkedAt: '2026-11-01T00:00:00.000Z',
});

function deps(over: Record<string, unknown> = {}) {
  return {
    sensorApi: {
      list: vi.fn().mockResolvedValue([sensor('a', 'u1'), sensor('b', 'u1'), sensor('c', 'u2')]),
    },
    readingApi: {
      listByUnit: vi.fn().mockImplementation(async (unit: string) => [{ unitId: unit }]),
    },
    lotApi: { list: vi.fn().mockResolvedValue([{ id: 'l' }]) },
    wasteApi: { list: vi.fn().mockResolvedValue([{ id: 't' }]) },
    ...over,
  };
}

describe('ApiReportDataSource', () => {
  it('reune sensores, lotes, tipos e o historico de cada unidade (uma chamada por unidade)', async () => {
    const d = deps();
    const data = await new ApiReportDataSource(d as never).collect();

    expect(data.sensors).toHaveLength(3);
    expect(data.lots).toEqual([{ id: 'l' }]);
    expect(data.wasteTypes).toEqual([{ id: 't' }]);
    expect(Object.keys(data.readingsByUnit).sort()).toEqual(['u1', 'u2']);
    expect(d.readingApi.listByUnit).toHaveBeenCalledTimes(2);
  });

  it('sem sensores nao consulta leituras', async () => {
    const d = deps({ sensorApi: { list: vi.fn().mockResolvedValue([]) } });
    const data = await new ApiReportDataSource(d as never).collect();
    expect(data.readingsByUnit).toEqual({});
    expect(d.readingApi.listByUnit).not.toHaveBeenCalled();
  });

  it('propaga o erro da API', async () => {
    const d = deps({ lotApi: { list: vi.fn().mockRejectedValue(new ApiError('Erro 403', 403)) } });
    await expect(new ApiReportDataSource(d as never).collect()).rejects.toMatchObject({
      message: 'Erro 403',
    });
  });
});
