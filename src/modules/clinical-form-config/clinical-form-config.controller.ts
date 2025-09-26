import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClinicalFormConfigService } from './clinical-form-config.service';
import { CreateClinicalFormConfigDto } from './dtos/create-clinical-form-config.dto';
import { UpdateClinicalFormConfigDto } from './dtos/update-clinical-form-config.dto';
import { BranchContext } from '../../common/decorators/branch-context.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('clinical-form-config')
@UseGuards(AuthGuard('jwt'))
export class ClinicalFormConfigController {
  constructor(private readonly configService: ClinicalFormConfigService) {}

  @Get('config')
  @RequirePermissions('clinical_config_read')
  async getConfig(
    @BranchContext() branchId: string,
    @Query('configName') configName?: string
  ) {
    return this.configService.getFormConfig(branchId, configName);
  }

  @Post('create')
  @RequirePermissions('clinical_config_create')
  async create(
    @Body(ValidationPipe) createDto: CreateClinicalFormConfigDto,
    @BranchContext() branchId: string
  ) {
    return this.configService.create(createDto, branchId);
  }

  @Patch('update/:id')
  @RequirePermissions('clinical_config_update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateClinicalFormConfigDto,
    @BranchContext() branchId: string
  ) {
    return this.configService.update(id, updateDto, branchId);
  }

  @Get(':id')
  @RequirePermissions('clinical_config_read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @BranchContext() branchId: string
  ) {
    return this.configService.findOne(id, branchId);
  }
}
