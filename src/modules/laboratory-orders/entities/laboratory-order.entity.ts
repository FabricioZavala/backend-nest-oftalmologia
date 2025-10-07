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
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { ClinicalHistory } from '../../clinical-histories/entities/clinical-history.entity';

export enum FrameType {
  THREE_PIECES_AIR = '3_piezas_al_aire',
  SEMI_AIR_GROOVED = 'ranurado_semiaire',
  COMPLETE = 'completo',
}

@Entity('laboratory_orders')
@Index(['branchId'])
@Index(['userId'])
@Index(['isConfirmed'])
@Index(['attendanceDate'])
@Index(['orderNumber'], { unique: true })
export class LaboratoryOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number', unique: true, nullable: true })
  orderNumber: number;

  @Column({ name: 'branch_id' })
  branchId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'clinical_history_id', nullable: true })
  clinicalHistoryId: string;

  // Step 1: Datos del Cliente
  @Column({ name: 'attendance_date', type: 'date', nullable: true })
  attendanceDate: Date;

  @Column({ name: 'delivery_date', type: 'date', nullable: true })
  deliveryDate: Date;

  // Step 2: Productos (Medidas Ópticas)
  @Column({ name: 'od_sphere', nullable: true })
  odSphere: string;

  @Column({ name: 'od_cylinder', nullable: true })
  odCylinder: string;

  @Column({ name: 'od_axis', nullable: true })
  odAxis: string;

  @Column({ name: 'od_add', nullable: true })
  odAdd: string;

  @Column({ name: 'od_height', nullable: true })
  odHeight: string;

  @Column({ name: 'od_dnp', nullable: true })
  odDnp: string;

  @Column({ name: 'od_cbase', nullable: true })
  odCbase: string;

  @Column({ name: 'od_sun_degree', nullable: true })
  odSunDegree: string;

  @Column({ name: 'od_prism', nullable: true })
  odPrism: string;

  @Column({ name: 'od_base', nullable: true })
  odBase: string;

  @Column({ name: 'oi_sphere', nullable: true })
  oiSphere: string;

  @Column({ name: 'oi_cylinder', nullable: true })
  oiCylinder: string;

  @Column({ name: 'oi_axis', nullable: true })
  oiAxis: string;

  @Column({ name: 'oi_add', nullable: true })
  oiAdd: string;

  @Column({ name: 'oi_height', nullable: true })
  oiHeight: string;

  @Column({ name: 'oi_dnp', nullable: true })
  oiDnp: string;

  @Column({ name: 'oi_cbase', nullable: true })
  oiCbase: string;

  @Column({ name: 'oi_sun_degree', nullable: true })
  oiSunDegree: string;

  @Column({ name: 'oi_prism', nullable: true })
  oiPrism: string;

  @Column({ name: 'oi_base', nullable: true })
  oiBase: string;

  // Step 3: Parámetros de Diseño Individual
  @Column({ name: 'd_vertex', nullable: true })
  dVertex: string;

  @Column({ name: 'pantos', nullable: true })
  pantos: string;

  @Column({ name: 'panora', nullable: true })
  panora: string;

  @Column({ name: 'frame_fit', nullable: true })
  frameFit: string;

  @Column({ name: 'profile', nullable: true })
  profile: string;

  @Column({ name: 'mid', nullable: true })
  mid: string;

  @Column({ name: 'dist_vp', nullable: true })
  distVp: string;

  @Column({ name: 'engraving', nullable: true })
  engraving: string;

  // Step 4: Datos de la Montura
  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @Column({
    type: 'enum',
    enum: FrameType,
    name: 'frame_type',
    nullable: true,
  })
  frameType: FrameType;

  @Column({ name: 'frame_type_description', nullable: true })
  frameTypeDescription: string;

  @Column({ name: 'frame_brand', nullable: true })
  frameBrand: string;

  @Column({ name: 'frame_model', nullable: true })
  frameModel: string;

  @Column({ name: 'frame_data', nullable: true })
  frameData: string;

  @Column({ name: 'frame_larger_diameter', nullable: true })
  frameLargerDiameter: string;

  @Column({ name: 'frame_horizontal', nullable: true })
  frameHorizontal: string;

  @Column({ name: 'frame_vertical', nullable: true })
  frameVertical: string;

  @Column({ name: 'frame_bridge', nullable: true })
  frameBridge: string;

  @Column({ name: 'observations', type: 'text', nullable: true })
  observations: string;

  // Estado
  @Column({ name: 'is_confirmed', default: false })
  isConfirmed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ClinicalHistory, { nullable: true })
  @JoinColumn({ name: 'clinical_history_id' })
  clinicalHistory: ClinicalHistory;
}
