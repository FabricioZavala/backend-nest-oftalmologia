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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { QueryProductDto } from './dtos/query-product.dto';
import { BranchContext } from '../../common/decorators/branch-context.decorator';

@Controller('products')
@UseGuards(AuthGuard('jwt'))
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('create')
  async create(
    @Body(ValidationPipe) createProductDto: CreateProductDto,
    @BranchContext() branchId: string
  ) {
    return this.productsService.create(createProductDto, branchId);
  }

  @Get('get-all')
  async findAll(
    @Query(ValidationPipe) queryDto: QueryProductDto,
    @BranchContext() branchId: string
  ) {
    return this.productsService.findAll(queryDto, branchId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @BranchContext() branchId: string
  ) {
    return this.productsService.findOne(id, branchId);
  }

  @Patch('update/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
    @BranchContext() branchId: string
  ) {
    return this.productsService.update(id, updateProductDto, branchId);
  }

  @Delete('delete/:id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @BranchContext() branchId: string
  ) {
    return this.productsService.remove(id, branchId);
  }
}
