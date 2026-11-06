import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Entidade ORM (TypeORM) de lote de residuo com destinacao registrada.
 * Vive na infraestrutura; o dominio nao a conhece (conversao via mapper).
 *
 * `wasteTypeId` e uma coluna simples (sem chave estrangeira): a existencia do tipo
 * e garantida pelo caso de uso no momento do registro.
 */
@Entity({ name: 'waste_lots' })
@Index(['date'])
export class WasteLotEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  wasteTypeId!: string;

  @Column({ type: 'varchar' })
  location!: string;

  @Column({ type: 'varchar' })
  receiverCompany!: string;

  @Column({ type: 'varchar' })
  license!: string;

  @Column({ type: 'timestamptz' })
  date!: Date;

  @Column({ type: 'double precision' })
  quantity!: number;

  @Column({ type: 'text' })
  proofReference!: string;

  @Column({ type: 'varchar' })
  status!: string;
}
