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
import { SubcategoriesService } from './subcategories.service';
import { CreateSubcategoryDto } from './dtos/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dtos/update-subcategory.dto';
import { QuerySubcategoryDto } from './dtos/query-subcategory.dto';
import { BranchContext } from '../../common/decorators/branch-context.decorator';

@Controller('subcategories')
@UseGuards(AuthGuard('jwt'))
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Post('create')
  async create(
    @Body(ValidationPipe) createSubcategoryDto: CreateSubcategoryDto,
    @BranchContext() branchId: string
  ) {
    return this.subcategoriesService.create(createSubcategoryDto, branchId);
  }

  @Get('get-all')
  async findAll(
    @Query(ValidationPipe) queryDto: QuerySubcategoryDto,
    @BranchContext() branchId: string
  ) {
    return this.subcategoriesService.findAll(queryDto, branchId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @BranchContext() branchId: string
  ) {
    return this.subcategoriesService.findOne(id, branchId);
  }

  @Patch('update/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateSubcategoryDto: UpdateSubcategoryDto,
    @BranchContext() branchId: string
  ) {
    return this.subcategoriesService.update(id, updateSubcategoryDto, branchId);
  }

  @Delete('delete/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @BranchContext() branchId: string
  ) {
    return this.subcategoriesService.remove(id, branchId);
  }
}
