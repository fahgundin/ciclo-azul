import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidade ORM (TypeORM) de leitura de consumo de agua.
 * Serie temporal append-only; id proprio gerado. Indexada por unidade+tempo para
 * consultas do painel (ultima leitura por unidade).
 */
@Entity({ name: 'water_readings' })
@Index(['unitId', 'timestamp'])
export class WaterReadingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  sensorId!: string;

  @Column({ type: 'varchar' })
  unitId!: string;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ type: 'double precision' })
  valueInLiters!: number;

  @Column({ type: 'varchar' })
  readingType!: string;
}
