import { describe, it, expect } from 'vitest';
import { CHART, buildChart, niceMax } from './chart';

describe('niceMax', () => {
  it.each([
    [0, 1],
    [-5, 1],
    [0.7, 1],
    [1.5, 2],
    [2.4, 2.5],
    [4.2, 5],
    [7, 10],
    [130, 200],
    [4200, 5000],
  ])('niceMax(%s) = %s', (value, expected) => {
    expect(niceMax(value)).toBe(expected);
  });
});

describe('buildChart', () => {
  const points = [
    { t: 0, v: 0 },
    { t: 1000, v: 50 },
    { t: 2000, v: 100 },
  ];

  it('retorna null com menos de 2 instantes distintos', () => {
    expect(buildChart([])).toBeNull();
    expect(buildChart([{ t: 1, v: 1 }])).toBeNull();
    expect(
      buildChart([
        { t: 5, v: 1 },
        { t: 5, v: 2 },
      ]),
    ).toBeNull();
  });

  it('o primeiro ponto fica na borda esquerda e o ultimo na direita', () => {
    const chart = buildChart(points)!;
    expect(chart.path.startsWith(`M${CHART.left.toFixed(1)},`)).toBe(true);
    expect(chart.path).toContain(`L${(CHART.width - CHART.right).toFixed(1)},`);
    expect(chart.xTicks.map((t) => t.anchor)).toEqual(['start', 'middle', 'end']);
    expect(chart.xTicks[0]?.x).toBe(CHART.left);
    expect(chart.xTicks[2]?.x).toBe(CHART.width - CHART.right);
  });

  it('o rotulo do meio fica no instante medio, mesmo com leituras agrupadas num extremo', () => {
    const chart = buildChart([
      { t: 0, v: 1 },
      { t: 10, v: 1 },
      { t: 20, v: 1 },
      { t: 1000, v: 1 },
    ])!;
    const [, middle] = chart.xTicks;
    expect(middle!.t).toBe(500);
    const plot = CHART.width - CHART.left - CHART.right;
    expect(middle!.x).toBeCloseTo(CHART.left + plot / 2, 5);
  });

  it('usa um maximo "bonito" acima do maior valor e 5 marcas no eixo Y', () => {
    const chart = buildChart(points)!;
    expect(chart.maxValue).toBe(200); // 100 * 1,1 = 110 -> 200
    expect(chart.yTicks).toHaveLength(5);
    expect(chart.yTicks[0]?.value).toBe(0);
    expect(chart.yTicks[4]?.value).toBe(200);
    // valor maior fica mais acima (y menor)
    expect(chart.yTicks[4]!.y).toBeLessThan(chart.yTicks[0]!.y);
  });

  it('o eixo X e proporcional ao tempo, nao ao indice', () => {
    const chart = buildChart([
      { t: 0, v: 1 },
      { t: 100, v: 1 },
      { t: 1000, v: 1 },
    ])!;
    const plot = CHART.width - CHART.left - CHART.right;
    const xOfSecond = CHART.left + (100 / 1000) * plot;
    expect(chart.path).toContain(`L${xOfSecond.toFixed(1)},`);
  });
});
