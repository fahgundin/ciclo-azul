import { WasteType } from '../../domain/waste-type';
import { WasteTypeEntity } from './waste-type.entity';

/**
 * Mapper entre a entidade de dominio WasteType e a entidade ORM WasteTypeEntity.
 * Centraliza a traducao para que o ORM nao vaze para o dominio.
 */
export const WasteTypeMapper = {
  toDomain(entity: WasteTypeEntity): WasteType {
    return WasteType.create({
      id: entity.id,
      name: entity.name,
      classification: entity.classification,
    });
  },

  toEntity(domain: WasteType): WasteTypeEntity {
    const entity = new WasteTypeEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.classification = domain.classification;
    return entity;
  },
};
