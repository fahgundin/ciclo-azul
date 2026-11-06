import type { WasteLotStatus } from '@ciclo-azul/contracts';
import { WasteLot } from '../../domain/waste-lot';
import { WasteLotEntity } from './waste-lot.entity';

/** Mapper entre WasteLot (dominio) e WasteLotEntity (ORM). */
export const WasteLotMapper = {
  toDomain(entity: WasteLotEntity): WasteLot {
    return WasteLot.restore({
      id: entity.id,
      wasteTypeId: entity.wasteTypeId,
      location: entity.location,
      receiverCompany: entity.receiverCompany,
      license: entity.license,
      date: entity.date,
      quantity: entity.quantity,
      proofReference: entity.proofReference,
      status: entity.status as WasteLotStatus,
    });
  },

  toEntity(domain: WasteLot): WasteLotEntity {
    const entity = new WasteLotEntity();
    entity.id = domain.id;
    entity.wasteTypeId = domain.wasteTypeId;
    entity.location = domain.location;
    entity.receiverCompany = domain.receiverCompany;
    entity.license = domain.license;
    entity.date = domain.date;
    entity.quantity = domain.quantity;
    entity.proofReference = domain.proofReference;
    entity.status = domain.status;
    return entity;
  },
};
