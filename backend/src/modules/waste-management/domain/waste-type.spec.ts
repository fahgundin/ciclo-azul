import { WasteType, WasteClassificationRequiredError } from './waste-type';

describe('WasteType (dominio)', () => {
  it('cria um tipo de residuo com classificacao', () => {
    const wt = WasteType.create({
      id: 'id-1',
      name: 'Óleo de refrigeração',
      classification: 'Metal pesado',
    });
    expect(wt.name).toBe('Óleo de refrigeração');
    expect(wt.classification).toBe('Metal pesado');
  });

  it('bloqueia cadastro sem classificacao com a mensagem exata (R07)', () => {
    expect(() =>
      WasteType.create({ id: 'id-2', name: 'Óleo de refrigeração', classification: '' }),
    ).toThrow(WasteClassificationRequiredError);
    expect(() =>
      WasteType.create({ id: 'id-2', name: 'Óleo de refrigeração', classification: '   ' }),
    ).toThrow('A classificação do resíduo é obrigatória');
  });

  it('bloqueia cadastro sem nome', () => {
    expect(() =>
      WasteType.create({ id: 'id-3', name: '', classification: 'Metal pesado' }),
    ).toThrow('O nome do resíduo é obrigatório');
  });
});
