import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  MinLength,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  adress?: string; // Alias para address

  @IsOptional()
  @IsString()
  @MinLength(1)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  document_number?: string; // Alias para documentNumber

  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  homePhone?: string;

  @IsOptional()
  @IsString()
  home_phone?: string; // Alias para homePhone

  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @IsOptional()
  @IsString()
  mobile_phone?: string; // Alias para mobilePhone

  @IsOptional()
  @IsString()
  profilePhoto?: string;
}
