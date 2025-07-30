import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column } from 'typeorm';

export class User extends BaseEntityCustom {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;
}
