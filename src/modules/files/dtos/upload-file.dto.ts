import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UploadFileDto {
  @IsString()
  entityType: string;

  @IsUUID()
  entityId: string;

  @IsOptional()
  @IsString()
  fileCategory?: string;
}
