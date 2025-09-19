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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { UpdateSupplierDto } from './dtos/update-supplier.dto';
import { QuerySupplierDto } from './dtos/query-supplier.dto';
import { BranchContext } from '../../common/decorators/branch-context.decorator';

@Controller('suppliers')
@UseGuards(AuthGuard('jwt'))
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post('create')
  async create(
    @Body(ValidationPipe) createSupplierDto: CreateSupplierDto,
    @BranchContext() branchId: string
  ) {
    return this.suppliersService.create(createSupplierDto, branchId);
  }

  @Get('get-all')
  async findAll(
    @Query(ValidationPipe) queryDto: QuerySupplierDto,
    @BranchContext() branchId: string
  ) {
    const result = await this.suppliersService.findAll(queryDto, branchId);

    if (result.data?.result?.length > 0) {
    }

    return result;
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @BranchContext() branchId: string
  ) {
    return this.suppliersService.findOne(id, branchId);
  }

  @Patch('update/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateSupplierDto: UpdateSupplierDto,
    @BranchContext() branchId: string
  ) {
    return this.suppliersService.update(id, updateSupplierDto, branchId);
  }

  @Delete('delete/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @BranchContext() branchId: string
  ) {
    return this.suppliersService.remove(id, branchId);
  }
}
