import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  identifier: string; // username or email

  @IsString()
  @MinLength(1)
  password: string;
}
