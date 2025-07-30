import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('users')
export class User extends BaseEntityCustom {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;
}
