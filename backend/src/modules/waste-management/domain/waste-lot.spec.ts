import {
  DisposalFieldRequiredError,
  DisposalProofRequiredError,
  InvalidDisposalDateError,
  InvalidDisposalQuantityError,
  WasteLot,
} from './waste-lot';

// "Agora" fixo: 5 de novembro de 2026, 15:00 UTC.
const NOW = new Date('2026-11-05T15:00:00.000Z');

function valid(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lot-1',
    wasteTypeId: 'type-1',
    location: 'Aterro Industrial Classe I - Campinas',
    receiverCompany: 'EcoResiduos Ltda',
    license: 'LO-12345/2026',
    date: '2026-11-04',
    quantity: 250,
    proofReference: 'https://docs.exemplo.com/mtr/987',
    ...overrides,
  };
}

describe('WasteLot.registerDisposal (dominio)', () => {
  it('registra a destinacao completa e o lote consta como Destinado', () => {
    const lot = WasteLot.registerDisposal(valid(), NOW);

    expect(lot.status).toBe('destined');
    expect(lot.wasteTypeId).toBe('type-1');
    expect(lot.location).toBe('Aterro Industrial Classe I - Campinas');
    expect(lot.receiverCompany).toBe('EcoResiduos Ltda');
    expect(lot.license).toBe('LO-12345/2026');
    expect(lot.quantity).toBe(250);
    expect(lot.proofReference).toBe('https://docs.exemplo.com/mtr/987');
    expect(lot.date.toISOString()).toBe('2026-11-04T00:00:00.000Z');
  });

  it('remove espacos nas pontas dos textos', () => {
    const lot = WasteLot.registerDisposal(
      valid({ location: '  Aterro X ', receiverCompany: ' Eco ', proofReference: '  doc-1 ' }),
      NOW,
    );
    expect(lot.location).toBe('Aterro X');
    expect(lot.receiverCompany).toBe('Eco');
    expect(lot.proofReference).toBe('doc-1');
  });

  it('aceita a data de hoje', () => {
    expect(() => WasteLot.registerDisposal(valid({ date: '2026-11-05' }), NOW)).not.toThrow();
  });

  // Cenario: Impedir registro sem comprovante
  it.each([
    ['vazio', ''],
    ['so espacos', '   '],
    ['ausente', undefined],
    ['nulo', null],
    ['nao e texto', 42],
  ])('bloqueia sem comprovante com a mensagem exata (R06): %s', (_label, proofReference) => {
    const attempt = () => WasteLot.registerDisposal(valid({ proofReference }), NOW);
    expect(attempt).toThrow(DisposalProofRequiredError);
    expect(attempt).toThrow('O comprovante de destinação é obrigatório');
  });

  it.each([
    ['tipo de residuo', 'wasteTypeId', 'O tipo de resíduo é obrigatório'],
    ['local', 'location', 'O local da destinação é obrigatório'],
    ['empresa receptora', 'receiverCompany', 'A empresa receptora é obrigatória'],
    ['licenca', 'license', 'A licença é obrigatória'],
  ])('exige %s', (_label, field, message) => {
    expect(() => WasteLot.registerDisposal(valid({ [field]: '  ' }), NOW)).toThrow(
      DisposalFieldRequiredError,
    );
    expect(() => WasteLot.registerDisposal(valid({ [field]: undefined }), NOW)).toThrow(message);
  });

  it.each([
    ['zero', 0],
    ['negativa', -5],
    ['NaN', Number.NaN],
    ['infinita', Number.POSITIVE_INFINITY],
    ['texto', '250'],
    ['ausente', undefined],
  ])('rejeita quantidade invalida: %s', (_label, quantity) => {
    expect(() => WasteLot.registerDisposal(valid({ quantity }), NOW)).toThrow(
      InvalidDisposalQuantityError,
    );
  });

  it.each([
    ['no futuro (amanha)', '2026-11-06'],
    ['hoje com hora futura', '2026-11-05T16:00:00.000Z'],
    ['texto nao-data', 'ontem'],
    ['vazia', ''],
    ['ausente', undefined],
    ['numero', 20261104],
  ])('rejeita data invalida: %s', (_label, date) => {
    expect(() => WasteLot.registerDisposal(valid({ date }), NOW)).toThrow(
      InvalidDisposalDateError,
    );
  });

  it('valida o comprovante por ultimo (campos anteriores tem prioridade)', () => {
    expect(() =>
      WasteLot.registerDisposal(valid({ location: '', proofReference: '' }), NOW),
    ).toThrow('O local da destinação é obrigatório');
  });
});

describe('WasteLot.restore', () => {
  it('reconstitui um lote ja registrado sem revalidar', () => {
    const lot = WasteLot.restore({
      id: 'lot-9',
      wasteTypeId: 'type-1',
      location: 'Aterro',
      receiverCompany: 'Eco',
      license: 'LO-1',
      date: new Date('2020-01-01T00:00:00.000Z'),
      quantity: 10,
      proofReference: 'doc',
      status: 'destined',
    });
    expect(lot.id).toBe('lot-9');
    expect(lot.status).toBe('destined');
  });
});
