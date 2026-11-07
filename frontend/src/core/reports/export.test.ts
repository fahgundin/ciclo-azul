import { describe, it, expect } from 'vitest';
import { csvNumber, csvText, reportFileName, reportHasData, reportToCsv } from './export';
import type { Report } from './report';

const REPORT: Report = {
  meta: {
    type: 'full',
    title: 'Conformidade ambiental completa',
    days: 30,
    generatedAt: '2026-11-07T12:00:00.000Z',
    generatedBy: 'Marina Costa',
  },
  water: [
    {
      unitId: 'dc-sp1',
      liters: 1234.5,
      readings: 3,
      sensorReadings: 2,
      manualReadings: 1,
      lastReadingAt: '2026-11-07T11:55:00.000Z',
    },
    {
      unitId: 'dc-cps',
      liters: 0,
      readings: 0,
      sensorReadings: 0,
      manualReadings: 0,
      lastReadingAt: null,
    },
  ],
  waste: [
    {
      lotId: 'l-1',
      wasteType: 'Óleo "usado"',
      classification: 'Metal pesado',
      quantity: 800,
      date: '2026-11-05T00:00:00.000Z',
      receiverCompany: 'EcoQuímica',
      location: 'Paulínia/SP',
      license: 'LO-1',
      proofReference: 'mtr-1.pdf',
    },
  ],
  checks: [{ label: 'Comprovante informado', ok: false, detail: '1 sem comprovante' }],
};

describe('csvText', () => {
  it('coloca entre aspas e duplica aspas internas', () => {
    expect(csvText('Óleo "usado"')).toBe('"Óleo ""usado"""');
  });

  it.each(['=1+1', '+55', '-10', '@SOMA(A1)', '\tcmd', '\rcmd'])(
    'neutraliza o texto que parece formula (%j)',
    (value) => {
      expect(csvText(value)).toBe(`"'${value}"`);
    },
  );

  it('nao altera textos comuns', () => {
    expect(csvText('Paulínia/SP')).toBe('"Paulínia/SP"');
  });
});

describe('csvNumber', () => {
  it('usa virgula decimal', () => {
    expect(csvNumber(1234.5)).toBe('1234,5');
    expect(csvNumber(80)).toBe('80');
  });
});

describe('reportToCsv', () => {
  const lines = reportToCsv(REPORT).split('\r\n');

  it('comeca com BOM e usa ; como separador', () => {
    expect(reportToCsv(REPORT).startsWith('﻿')).toBe(true);
    expect(lines[0]).toContain('"Conformidade ambiental completa";"Gerado em ');
    expect(lines[0]).toContain('por Marina Costa"');
    expect(lines[1]).toBe('"Período: últimos 30 dias"');
  });

  it('leva a ressalva "gerado no navegador / soma das leituras" no cabecalho do arquivo', () => {
    expect(lines[2]).toMatch(/^"Atenção: Gerado no navegador/);
    expect(lines[2]).toContain('soma das leituras do período');
    expect(lines[3]).toBe('');
  });

  it('traz a secao de consumo com os valores numericos em pt-BR', () => {
    const start = lines.indexOf('"CONSUMO DE ÁGUA"');
    expect(start).toBeGreaterThan(0);
    expect(lines[start + 1]).toBe(
      '"Unidade";"Soma das leituras (L)";"Leituras";"Leituras de sensor";"Leituras manuais";"Última leitura"',
    );
    expect(lines[start + 2]).toMatch(/^"dc-sp1";1234,5;3;2;1;"\d{2}\/\d{2}\/2026,? \d{2}:\d{2}"$/);
    expect(lines[start + 3]).toBe('"dc-cps";0;0;0;0;""');
  });

  it('traz a secao de residuos com data de calendario e aspas escapadas', () => {
    const start = lines.indexOf('"RESÍDUOS"');
    expect(lines[start + 2]).toBe(
      '"l-1";"Óleo ""usado""";"Metal pesado";800;"05/11/2026";"EcoQuímica";"Paulínia/SP";"LO-1";"mtr-1.pdf";"Destinado"',
    );
  });

  it('traz a secao de conformidade', () => {
    const start = lines.indexOf('"CONFORMIDADE"');
    expect(lines[start + 1]).toBe('"Item";"Atende";"Detalhe"');
    expect(lines[start + 2]).toBe('"Comprovante informado";"Não";"1 sem comprovante"');
  });

  it('omite as secoes vazias', () => {
    const csv = reportToCsv({ ...REPORT, water: [], checks: [] });
    expect(csv).not.toContain('CONSUMO DE ÁGUA');
    expect(csv).not.toContain('CONFORMIDADE');
    expect(csv).toContain('RESÍDUOS');
  });
});

describe('reportFileName / reportHasData', () => {
  it('monta o nome com o tipo e a data da geracao', () => {
    expect(reportFileName(REPORT)).toBe('ciclo-azul-full-2026-11-07');
  });

  it('detecta relatorio sem nenhum dado', () => {
    expect(reportHasData(REPORT)).toBe(true);
    expect(reportHasData({ ...REPORT, water: [], waste: [], checks: [] })).toBe(false);
  });
});
