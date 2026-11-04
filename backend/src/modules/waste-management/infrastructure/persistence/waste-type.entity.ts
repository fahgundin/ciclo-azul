import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Entidade ORM (TypeORM) de tipo de residuo.
 *
 * Vive na camada de infraestrutura e NAO e usada pelo dominio. A conversao para
 * a entidade de dominio e feita por um mapper (waste-type.mapper.ts), evitando
 * vazar o ORM para dentro do dominio.
 */
@Entity({ name: 'waste_types' })
export class WasteTypeEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  classification!: string;
}
