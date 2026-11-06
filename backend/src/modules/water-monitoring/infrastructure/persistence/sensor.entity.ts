import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Entidade ORM (TypeORM) de sensor vinculado a uma unidade.
 * Vive na infraestrutura; o dominio nao a conhece (conversao via mapper).
 */
@Entity({ name: 'sensors' })
@Index(['unitId'])
export class SensorEntity {
  @PrimaryColumn({ type: 'varchar' })
  sensorId!: string;

  @Column({ type: 'varchar' })
  unitId!: string;

  @Column({ type: 'varchar' })
  status!: string;

  @Column({ type: 'timestamptz' })
  linkedAt!: Date;
}
