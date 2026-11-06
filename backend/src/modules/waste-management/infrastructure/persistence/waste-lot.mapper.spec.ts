import { WasteLot } from '../../domain/waste-lot';
import { WasteLotEntity } from './waste-lot.entity';
import { WasteLotMapper } from './waste-lot.mapper';

describe('WasteLotMapper', () => {
  const date = new Date('2026-11-04T00:00:00.000Z');

  it('converte dominio -> ORM preservando todos os campos', () => {
    const lot = WasteLot.registerDisposal(
      {
        id: 'b4f0c1de-0000-4000-8000-000000000001',
        wasteTypeId: 'b4f0c1de-0000-4000-8000-000000000002',
        location: 'Aterro',
        receiverCompany: 'Eco',
        license: 'LO-1',
        date: '2026-11-04',
        quantity: 250,
        proofReference: 'doc-1',
      },
      new Date('2026-11-05T15:00:00.000Z'),
    );

    const entity = WasteLotMapper.toEntity(lot);
    expect(entity).toBeInstanceOf(WasteLotEntity);
    expect(entity).toEqual({
      id: 'b4f0c1de-0000-4000-8000-000000000001',
      wasteTypeId: 'b4f0c1de-0000-4000-8000-000000000002',
      location: 'Aterro',
      receiverCompany: 'Eco',
      license: 'LO-1',
      date,
      quantity: 250,
      proofReference: 'doc-1',
      status: 'destined',
    });
  });

  it('converte ORM -> dominio', () => {
    const entity = new WasteLotEntity();
    entity.id = 'lot-1';
    entity.wasteTypeId = 'type-1';
    entity.location = 'Aterro';
    entity.receiverCompany = 'Eco';
    entity.license = 'LO-1';
    entity.date = date;
    entity.quantity = 10;
    entity.proofReference = 'doc-1';
    entity.status = 'destined';

    const lot = WasteLotMapper.toDomain(entity);
    expect(lot).toBeInstanceOf(WasteLot);
    expect(lot.status).toBe('destined');
    expect(lot.date).toBe(date);
    expect(lot.quantity).toBe(10);
  });
});
