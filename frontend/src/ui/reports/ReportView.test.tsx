import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FULL_REPORT } from './fixtures';
import { ReportView } from './ReportView';

describe('ReportView', () => {
  it('mostra titulo, periodo e quem gerou', () => {
    render(<ReportView report={FULL_REPORT} />);
    expect(
      screen.getByRole('heading', { name: 'Conformidade ambiental completa' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Últimos 30 dias · gerado em/)).toHaveTextContent('por Marina Costa');
  });

  it('marca cada item verificado com icone e texto: Atende / Não atende', () => {
    render(<ReportView report={FULL_REPORT} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Comprovante e licença informados em toda destinação');
    expect(items[0]).toHaveTextContent('Atende');
    expect(items[1]).toHaveTextContent('Unidades com leitura recente no momento da geração');
    expect(items[1]).toHaveTextContent('Não atende');
    expect(items[1].querySelector('.tag--warn')).not.toBeNull();
  });

  it('rotula a coluna de litros como soma das leituras, nao como consumo oficial', () => {
    render(<ReportView report={FULL_REPORT} />);
    expect(screen.getByRole('columnheader', { name: 'Soma das leituras (L)' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Consumo (L)' })).not.toBeInTheDocument();
  });

  it('leva a ressalva "gerado no navegador / soma das leituras" para dentro do documento (PDF)', () => {
    render(<ReportView report={FULL_REPORT} />);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Gerado no navegador');
    expect(note).toHaveTextContent('soma das leituras do período');
  });

  it('mostra a tabela de consumo em litros com a divisao sensor/manual', () => {
    render(<ReportView report={FULL_REPORT} />);
    const [water] = screen.getAllByRole('table');
    const rows = within(water!).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('dc-sp1');
    expect(rows[1]).toHaveTextContent('1.234,5');
    expect(rows[1]).toHaveTextContent('3 (2 sensor, 1 manual)');
    expect(rows[2]).toHaveTextContent('dc-cps');
    expect(rows[2]).toHaveTextContent('—');
  });

  it('mostra a tabela de residuos com a data de calendario em UTC', () => {
    render(<ReportView report={FULL_REPORT} />);
    const waste = screen.getAllByRole('table')[1]!;
    const cells = within(within(waste).getAllByRole('row')[1]!).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('Óleo de refrigeração (Metal pesado)');
    expect(cells[2]).toHaveTextContent('05/11/2026');
    expect(cells[6]).toHaveTextContent('mtr-0140.pdf');
  });

  it('avisa quando nao ha dados no periodo', () => {
    render(<ReportView report={{ ...FULL_REPORT, water: [], waste: [], checks: [] }} />);
    expect(screen.getByText('Não há dados no período selecionado.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('omite as secoes vazias', () => {
    render(<ReportView report={{ ...FULL_REPORT, water: [], checks: [] }} />);
    expect(screen.queryByRole('heading', { name: 'Consumo de água' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Itens verificados' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Destinação de resíduos' })).toBeInTheDocument();
  });
});
