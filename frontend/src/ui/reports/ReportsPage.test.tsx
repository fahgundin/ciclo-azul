import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../core/api/api-error';
import type { ReportDataSource, ReportSourceData } from '../../core/reports/report-data-source';
import { FlashProvider } from '../components/Flash';
import { UserProvider } from '../UserContext';
import { ReportsPage } from './ReportsPage';

const NOW = new Date('2026-11-07T12:00:00.000Z');

const DATA: ReportSourceData = {
  sensors: [
    {
      sensorId: 'sn-1',
      unitId: 'dc-sp1',
      status: 'connected',
      linkedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  readingsByUnit: {
    'dc-sp1': [
      {
        sensorId: 'sn-1',
        unitId: 'dc-sp1',
        timestamp: '2026-11-07T11:58:00.000Z',
        valueInLiters: 120,
        readingType: 'sensor',
      },
    ],
  },
  lots: [
    {
      id: 'l-1',
      wasteTypeId: 'wt-1',
      location: 'Paulínia/SP',
      receiverCompany: 'EcoQuímica Ambiental',
      license: 'LO-2043/2025',
      date: '2026-11-05T00:00:00.000Z',
      quantity: 800,
      proofReference: 'mtr-0140.pdf',
      status: 'destined',
    },
  ],
  wasteTypes: [{ id: 'wt-1', name: 'Óleo de refrigeração', classification: 'Metal pesado' }],
};

function setup(data: ReportSourceData | Error = DATA) {
  const collect = vi.fn(async () => {
    if (data instanceof Error) {
      throw data;
    }
    return data;
  });
  const source: ReportDataSource = { collect };
  const saveFile = vi.fn();
  const printReport = vi.fn();
  render(
    <FlashProvider>
      <UserProvider user={{ name: 'Marina Costa', email: null, roles: ['gestor-ambiental'] }}>
        <ReportsPage
          source={source}
          now={() => NOW}
          saveFile={saveFile}
          printReport={printReport}
        />
      </UserProvider>
    </FlashProvider>,
  );
  return { collect, saveFile, printReport, user: userEvent.setup() };
}

const generate = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Gerar relatório' }));

describe('ReportsPage (R09 / HU09)', () => {
  it('abre com o formulario e a anotacao de que o relatorio e gerado no navegador', () => {
    setup();
    expect(screen.getByLabelText('Tipo de relatório')).toHaveValue('full');
    expect(screen.getByLabelText('Período')).toHaveValue('30');
    expect(screen.getByLabelText('Formato')).toHaveValue('pdf');
    expect(screen.getByText(/gerado no navegador com os dados da API/)).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('gera o relatorio com os dados do periodo e quem gerou', async () => {
    const { collect, user } = setup();
    await generate(user);

    const report = await screen.findByRole('article');
    expect(collect).toHaveBeenCalledTimes(1);
    expect(
      within(report).getByRole('heading', { name: 'Conformidade ambiental completa' }),
    ).toBeInTheDocument();
    expect(report).toHaveTextContent('por Marina Costa');
    expect(report).toHaveTextContent('dc-sp1');
    expect(report).toHaveTextContent('Óleo de refrigeração (Metal pesado)');
  });

  // Cenario: Gerar relatorio em CSV
  it('CSV: baixa o arquivo com os registros do periodo', async () => {
    const { saveFile, user } = setup();
    await user.selectOptions(screen.getByLabelText('Formato'), 'csv');
    await generate(user);
    await user.click(await screen.findByRole('button', { name: 'Baixar CSV' }));

    expect(saveFile).toHaveBeenCalledTimes(1);
    const [name, content, mime] = saveFile.mock.calls[0]!;
    expect(name).toBe('ciclo-azul-full-2026-11-07.csv');
    expect(mime).toBe('text/csv;charset=utf-8');
    expect(content.startsWith('﻿')).toBe(true);
    expect(content).toContain('"RESÍDUOS"');
    expect(content).toContain('"l-1";"Óleo de refrigeração"');
    expect(screen.getByRole('status')).toHaveTextContent('Arquivo CSV gerado.');
  });

  // Cenario: Gerar relatorio em PDF
  it('PDF: abre a impressao (salvar como PDF) e nao baixa CSV', async () => {
    const { saveFile, printReport, user } = setup();
    await generate(user);
    await user.click(await screen.findByRole('button', { name: 'Imprimir / salvar PDF' }));

    expect(printReport).toHaveBeenCalledTimes(1);
    expect(saveFile).not.toHaveBeenCalled();
  });

  it('mantem uma copia do relatorio na area de impressao', async () => {
    const { user } = setup();
    await generate(user);
    await screen.findByRole('article');
    const printArea = document.querySelector('.print-area');
    expect(printArea).not.toBeNull();
    expect(printArea).toHaveTextContent('Conformidade ambiental completa');
  });

  it('trocar tipo ou periodo descarta o relatorio ja gerado', async () => {
    const { user } = setup();
    await generate(user);
    await screen.findByRole('article');

    await user.selectOptions(screen.getByLabelText('Tipo de relatório'), 'water');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    await generate(user);
    await screen.findByRole('article');
    await user.selectOptions(screen.getByLabelText('Período'), '7');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('relatorio so de agua nao traz a tabela de residuos', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Tipo de relatório'), 'water');
    await generate(user);
    const report = await screen.findByRole('article');

    expect(within(report).getAllByRole('table')).toHaveLength(1);
    expect(report).not.toHaveTextContent('Óleo de refrigeração');
  });

  it('sem dados no periodo avisa e desabilita a exportacao', async () => {
    const { user } = setup({ sensors: [], readingsByUnit: {}, lots: [], wasteTypes: [] });
    await generate(user);

    const report = await screen.findByRole('article');
    expect(within(report).getByText('Não há dados no período selecionado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprimir / salvar PDF' })).toBeDisabled();
  });

  it('mostra o erro da API ao falhar e nao deixa relatorio', async () => {
    const { user } = setup(new ApiError('Erro 403', 403));
    await generate(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro 403');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('usa mensagem generica para falhas de rede', async () => {
    const { user } = setup(new TypeError('Failed to fetch'));
    await generate(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao gerar o relatório');
  });

  it('lista as exportacoes desta sessao (em memoria)', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Formato'), 'csv');
    await generate(user);
    await user.click(await screen.findByRole('button', { name: 'Baixar CSV' }));

    const history = screen.getByRole('region', { name: 'Exportados nesta sessão' });
    expect(history).toHaveTextContent('Conformidade ambiental completa');
    expect(history).toHaveTextContent('30 dias · CSV');
  });
});
