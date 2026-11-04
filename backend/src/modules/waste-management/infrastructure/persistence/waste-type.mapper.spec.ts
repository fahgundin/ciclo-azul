import { WasteTypeMapper } from './waste-type.mapper';
import { WasteTypeEntity } from './waste-type.entity';
import { WasteType } from '../../domain/waste-type';

describe('WasteTypeMapper', () => {
  it('converte entidade ORM -> dominio', () => {
    const entity = new WasteTypeEntity();
    entity.id = 'id-1';
    entity.name = 'Óleo de refrigeração';
    entity.classification = 'Metal pesado';

    const domain = WasteTypeMapper.toDomain(entity);
    expect(domain).toBeInstanceOf(WasteType);
    expect(domain.id).toBe('id-1');
    expect(domain.classification).toBe('Metal pesado');
  });

  it('converte dominio -> entidade ORM preservando os campos', () => {
    const domain = WasteType.create({
      id: 'id-2',
      name: 'Solvente',
      classification: 'Quimico',
    });
    const entity = WasteTypeMapper.toEntity(domain);
    expect(entity).toBeInstanceOf(WasteTypeEntity);
    expect(entity).toEqual({ id: 'id-2', name: 'Solvente', classification: 'Quimico' });
  });
});
