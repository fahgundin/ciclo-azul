import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineChart } from './LineChart';

describe('LineChart', () => {
  it('sem pontos suficientes avisa que aguarda mais leituras', () => {
    render(<LineChart points={[{ t: 1, v: 1 }]} label="x" />);
    expect(
      screen.getByText('Aguardando mais leituras para desenhar o gráfico.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('desenha a linha, o rotulo acessivel e os eixos', () => {
    const { container } = render(
      <LineChart
        label="Leituras de consumo de dc-sp1, em litros"
        points={[
          { t: new Date(2026, 10, 7, 10, 0).getTime(), v: 10 },
          { t: new Date(2026, 10, 7, 10, 30).getTime(), v: 40 },
          { t: new Date(2026, 10, 7, 11, 0).getTime(), v: 20 },
        ]}
      />,
    );
    expect(
      screen.getByRole('img', { name: 'Leituras de consumo de dc-sp1, em litros' }),
    ).toBeInTheDocument();
    expect(container.querySelector('path.chart__line')?.getAttribute('d')).toMatch(
      /^M[\d.]+,[\d.]+L/,
    );
    expect(container.querySelectorAll('line.chart__grid')).toHaveLength(5);
    const labels = [...container.querySelectorAll('text')].map((t) => t.textContent);
    expect(labels).toContain('10:00');
    expect(labels).toContain('10:30');
    expect(labels).toContain('11:00');
  });
});
