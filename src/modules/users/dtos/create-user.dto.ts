import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  MinLength,
} from 'class-validator';

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
  profilePhoto?: string;
}
