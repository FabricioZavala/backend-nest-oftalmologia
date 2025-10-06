import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { FrameType } from '../entities/laboratory-order.entity';

export class CreateLaboratoryOrderDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsUUID()
  clinicalHistoryId?: string;

  @IsDateString()
  @IsNotEmpty()
  attendanceDate: string;

  @IsDateString()
  @IsNotEmpty()
  deliveryDate: string;

  @IsOptional()
  @IsString()
  odSphere?: string;

  @IsOptional()
  @IsString()
  odCylinder?: string;

  @IsOptional()
  @IsString()
  odAxis?: string;

  @IsOptional()
  @IsString()
  odAdd?: string;

  @IsOptional()
  @IsString()
  odHeight?: string;

  @IsOptional()
  @IsString()
  odDnp?: string;

  @IsOptional()
  @IsString()
  odCbase?: string;

  @IsOptional()
  @IsString()
  odSunDegree?: string;

  @IsOptional()
  @IsString()
  odPrism?: string;

  @IsOptional()
  @IsString()
  odBase?: string;

  @IsOptional()
  @IsString()
  oiSphere?: string;

  @IsOptional()
  @IsString()
  oiCylinder?: string;

  @IsOptional()
  @IsString()
  oiAxis?: string;

  @IsOptional()
  @IsString()
  oiAdd?: string;

  @IsOptional()
  @IsString()
  oiHeight?: string;

  @IsOptional()
  @IsString()
  oiDnp?: string;

  @IsOptional()
  @IsString()
  oiCbase?: string;

  @IsOptional()
  @IsString()
  oiSunDegree?: string;

  @IsOptional()
  @IsString()
  oiPrism?: string;

  @IsOptional()
  @IsString()
  oiBase?: string;

  @IsOptional()
  @IsString()
  dVertex?: string;

  @IsOptional()
  @IsString()
  pantos?: string;

  @IsOptional()
  @IsString()
  panora?: string;

  @IsOptional()
  @IsString()
  frameFit?: string;

  @IsOptional()
  @IsString()
  profile?: string;

  @IsOptional()
  @IsString()
  mid?: string;

  @IsOptional()
  @IsString()
  distVp?: string;

  @IsOptional()
  @IsString()
  engraving?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsEnum(FrameType)
  frameType?: FrameType;

  @IsOptional()
  @IsString()
  frameTypeDescription?: string;

  @IsOptional()
  @IsString()
  frameBrand?: string;

  @IsOptional()
  @IsString()
  frameModel?: string;

  @IsOptional()
  @IsString()
  frameData?: string;

  @IsOptional()
  @IsString()
  frameLargerDiameter?: string;

  @IsOptional()
  @IsString()
  frameHorizontal?: string;

  @IsOptional()
  @IsString()
  frameVertical?: string;

  @IsOptional()
  @IsString()
  frameBridge?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}
