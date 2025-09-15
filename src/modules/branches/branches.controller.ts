import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dtos/create-branch.dto';
import { UpdateBranchDto } from './dtos/update-branch.dto';
import { QueryBranchDto } from './dtos/query-branch.dto';

@Controller('branches')
@UseGuards(AuthGuard('jwt'))
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post('create')
  async create(@Body(ValidationPipe) createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }

  @Get('get-all')
  async findAll(@Query(ValidationPipe) queryDto: QueryBranchDto) {
    return this.branchesService.findAll(queryDto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch('update/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateBranchDto: UpdateBranchDto
  ) {
    return this.branchesService.update(id, updateBranchDto);
  }

  @Delete('delete/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchesService.remove(id);
  }
}
