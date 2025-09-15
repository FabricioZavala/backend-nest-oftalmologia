import { IsString, IsNotEmpty, IsUUID, Length } from 'class-validator';

export class CreateSubcategoryDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;
}
