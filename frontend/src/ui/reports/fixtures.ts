import type { Report } from '../../core/reports/report';

/** Relatorio completo de exemplo, compartilhado pelos testes da UI de relatorios. */
export const FULL_REPORT: Report = {
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
      wasteType: 'Óleo de refrigeração',
      classification: 'Metal pesado',
      quantity: 800,
      date: '2026-11-05T00:00:00.000Z',
      receiverCompany: 'EcoQuímica Ambiental',
      location: 'Paulínia/SP',
      license: 'LO-2043/2025',
      proofReference: 'mtr-0140.pdf',
    },
  ],
  checks: [
    {
      label: 'Comprovante e licença informados em toda destinação',
      ok: true,
      detail: '1 destinação(ões), 0 sem comprovante ou licença',
    },
    {
      label: 'Unidades com leitura recente',
      ok: false,
      detail: '2 unidade(s), 1 sem leitura nos últimos 15 minutos',
    },
  ],
};
