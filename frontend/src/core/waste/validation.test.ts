import { describe, it, expect } from 'vitest';
import {
  DISPOSAL_COMPANY_REQUIRED,
  DISPOSAL_DATE_INVALID,
  DISPOSAL_LICENSE_REQUIRED,
  DISPOSAL_LOCATION_REQUIRED,
  DISPOSAL_PROOF_REQUIRED,
  DISPOSAL_QUANTITY_INVALID,
  DISPOSAL_TYPE_REQUIRED,
  validateDisposal,
  type DisposalFormValues,
} from './validation';

const NOW = new Date('2026-11-05T15:00:00Z');
const valid: DisposalFormValues = {
  wasteTypeId: 'wt-1',
  location: 'Paulínia/SP',
  receiverCompany: 'EcoQuímica Ambiental',
  license: 'LO-2043/2025',
  date: '2026-11-05',
  quantity: 800,
  proofReference: 'mtr-0140.pdf',
};

describe('validateDisposal (R06)', () => {
  it('aceita uma destinacao completa', () => {
    expect(validateDisposal(valid, NOW)).toEqual({});
  });

  it('exige tipo, local, empresa e licenca (ignorando espacos)', () => {
    const errors = validateDisposal(
      { ...valid, wasteTypeId: ' ', location: '', receiverCompany: '  ', license: '' },
      NOW,
    );
    expect(errors).toEqual({
      wasteTypeId: DISPOSAL_TYPE_REQUIRED,
      location: DISPOSAL_LOCATION_REQUIRED,
      receiverCompany: DISPOSAL_COMPANY_REQUIRED,
      license: DISPOSAL_LICENSE_REQUIRED,
    });
  });

  // Cenario HU07: Impedir registro sem comprovante
  it('bloqueia sem comprovante com a mensagem exata do criterio de aceitacao', () => {
    expect(validateDisposal({ ...valid, proofReference: '   ' }, NOW).proofReference).toBe(
      'O comprovante de destinação é obrigatório',
    );
    expect(DISPOSAL_PROOF_REQUIRED).toBe('O comprovante de destinação é obrigatório');
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejeita quantidade %s', (quantity) => {
    expect(validateDisposal({ ...valid, quantity }, NOW).quantity).toBe(DISPOSAL_QUANTITY_INVALID);
  });

  it('aceita quantidade decimal positiva', () => {
    expect(validateDisposal({ ...valid, quantity: 0.5 }, NOW)).toEqual({});
  });

  it('aceita a data de hoje e datas passadas, sem limite inferior', () => {
    expect(validateDisposal({ ...valid, date: '2026-11-05' }, NOW).date).toBeUndefined();
    expect(validateDisposal({ ...valid, date: '2020-01-01' }, NOW).date).toBeUndefined();
  });

  it('rejeita data no futuro', () => {
    expect(validateDisposal({ ...valid, date: '2026-11-06' }, NOW).date).toBe(
      DISPOSAL_DATE_INVALID,
    );
  });

  it.each(['', '  ', 'amanha', '2026-13-40'])('rejeita data invalida (%j)', (date) => {
    expect(validateDisposal({ ...valid, date }, NOW).date).toBe(DISPOSAL_DATE_INVALID);
  });

  it('acumula todos os erros de um formulario vazio', () => {
    const errors = validateDisposal(
      {
        wasteTypeId: '',
        location: '',
        receiverCompany: '',
        license: '',
        date: '',
        quantity: Number.NaN,
        proofReference: '',
      },
      NOW,
    );
    expect(Object.keys(errors).sort()).toEqual([
      'date',
      'license',
      'location',
      'proofReference',
      'quantity',
      'receiverCompany',
      'wasteTypeId',
    ]);
  });
});
