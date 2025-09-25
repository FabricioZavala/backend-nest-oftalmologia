import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class CreateShiftDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
