import { useMemo } from 'react';
import { formatNumber, formatTime } from '../../core/format';
import { CHART, buildChart } from '../../core/water/chart';
import type { ChartPoint } from '../../core/water/consumption';

/** Grafico de linha SVG das leituras (litros x hora). A geometria vem de core/water/chart. */
export function LineChart({ points, label }: { points: ChartPoint[]; label: string }): JSX.Element {
  const chart = useMemo(() => buildChart(points), [points]);

  if (!chart) {
    return <p className="hint">Aguardando mais leituras para desenhar o gráfico.</p>;
  }

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      role="img"
      aria-label={label}
    >
      {chart.yTicks.map((tick) => (
        <g key={tick.y}>
          <line
            className="chart__grid"
            x1={CHART.left}
            x2={CHART.width - CHART.right}
            y1={tick.y}
            y2={tick.y}
          />
          <text className="chart__axis" x={CHART.left - 6} y={tick.y + 4} textAnchor="end">
            {formatNumber(tick.value)}
          </text>
        </g>
      ))}
      {chart.xTicks.map((tick) => (
        <text
          key={tick.anchor}
          className="chart__axis"
          x={tick.x}
          y={CHART.height - 6}
          textAnchor={tick.anchor}
        >
          {formatTime(tick.t)}
        </text>
      ))}
      <path className="chart__line" d={chart.path} />
    </svg>
  );
}
