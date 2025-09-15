import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchDto } from './create-branch.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
