import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';

@Entity('clinical_form_configs')
@Index(['branchId'])
export class ClinicalFormConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @Column({ name: 'config_name' })
  configName: string;

  @Column({ type: 'jsonb' })
  fieldsConfig: {
    sections: {
      [sectionName: string]: {
        visible: boolean;
        fields: {
          [fieldName: string]: boolean;
        };
      };
    };
  };

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'version', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;
}
