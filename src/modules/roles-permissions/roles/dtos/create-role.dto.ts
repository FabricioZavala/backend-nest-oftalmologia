import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  roleName: string;

  @IsOptional()
  @IsString()
  description?: string;
}
