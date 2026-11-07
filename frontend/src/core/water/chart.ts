import type { ChartPoint } from './consumption';

/**
 * Geometria do grafico de linha de consumo (core/, pura): converte pontos em
 * coordenadas de um SVG. A UI so desenha.
 */

export const CHART = { width: 360, height: 190, left: 44, right: 8, top: 12, bottom: 24 } as const;

/** Arredonda o maximo para um valor "bonito" (1, 2, 2,5, 5 ou 10 x potencia de 10). */
export function niceMax(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const power = 10 ** Math.floor(Math.log10(value));
  const n = value / power;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * power;
}

export interface ChartGeometry {
  /** Atributo `d` do <path> da linha. */
  path: string;
  maxValue: number;
  yTicks: { y: number; value: number }[];
  xTicks: { x: number; t: number; anchor: 'start' | 'middle' | 'end' }[];
}

/** Retorna `null` quando nao ha pontos suficientes (menos de 2 instantes distintos). */
export function buildChart(points: readonly ChartPoint[]): ChartGeometry | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || last.t === first.t) {
    return null;
  }

  const { width, height, left, right, top, bottom } = CHART;
  const maxValue = niceMax(Math.max(...points.map((p) => p.v)) * 1.1);
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (t: number): number => left + ((t - first.t) / (last.t - first.t)) * plotWidth;
  const y = (v: number): number => top + plotHeight * (1 - v / maxValue);

  const path = points
    .map((p, index) => `${index === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join('');

  const yTicks = [0, 1, 2, 3, 4].map((step) => {
    const value = (maxValue / 4) * step;
    return { y: y(value), value };
  });

  const middle = points[Math.floor(points.length / 2)] ?? first;
  const xTicks = [
    { x: x(first.t), t: first.t, anchor: 'start' as const },
    { x: x(middle.t), t: middle.t, anchor: 'middle' as const },
    { x: x(last.t), t: last.t, anchor: 'end' as const },
  ];

  return { path, maxValue, yTicks, xTicks };
}
