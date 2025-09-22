import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Subcategory } from '../subcategories/entities/subcategory.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { QueryProductDto } from './dtos/query-product.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>
  ) {}

  async create(createProductDto: CreateProductDto, branchId: string) {
    const existingProduct = await this.productRepository.findOne({
      where: {
        code: createProductDto.code,
        branchId,
      },
    });

    if (existingProduct) {
      throw new ConflictException({
        statusCode: 409,
        success: false,
        message: {
          es: 'Ya existe un producto con este código en esta sucursal',
          en: 'A product with this code already exists in this branch',
        },
      });
    }

    await this.validateRelatedEntities(createProductDto, branchId);

    const product = this.productRepository.create({
      ...createProductDto,
      branchId,
    });

    const savedProduct = await this.productRepository.save(product);

    return {
      statusCode: 201,
      success: true,
      message: {
        es: 'Producto creado exitosamente',
        en: 'Product created successfully',
      },
      data: savedProduct,
    };
  }

  async findAll(queryDto: QueryProductDto, branchId: string) {
    const { skip, take } = PaginationUtil.getSkipAndTake(queryDto);
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .leftJoinAndSelect('product.defaultSupplier', 'supplier');

    queryBuilder.where('product.branchId = :branchId', { branchId });

    if (queryDto.code) {
      queryBuilder.andWhere('product.code ILIKE :code', {
        code: `%${queryDto.code}%`,
      });
    }

    if (queryDto.name) {
      queryBuilder.andWhere('product.name ILIKE :name', {
        name: `%${queryDto.name}%`,
      });
    }

    if (queryDto.brand) {
      queryBuilder.andWhere('product.brand ILIKE :brand', {
        brand: `%${queryDto.brand}%`,
      });
    }

    if (queryDto.unitPrice !== undefined) {
      queryBuilder.andWhere('product.unitPrice = :unitPrice', {
        unitPrice: queryDto.unitPrice,
      });
    }

    if (queryDto.quantity !== undefined) {
      queryBuilder.andWhere('product.quantity = :quantity', {
        quantity: queryDto.quantity,
      });
    }

    if (queryDto.categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId: queryDto.categoryId,
      });
    }

    if (queryDto.subcategoryId) {
      queryBuilder.andWhere('product.subcategoryId = :subcategoryId', {
        subcategoryId: queryDto.subcategoryId,
      });
    }

    if (queryDto.supplierId) {
      queryBuilder.andWhere('product.defaultSupplierId = :supplierId', {
        supplierId: queryDto.supplierId,
      });
    }

    if (queryDto.isActive !== undefined) {
      queryBuilder.andWhere('product.isActive = :isActive', {
        isActive: queryDto.isActive,
      });
    }

    queryBuilder.orderBy('product.createdAt', 'DESC').skip(skip).take(take);

    const [products, totalCount] = await queryBuilder.getManyAndCount();

    const paginationResult = PaginationUtil.paginate(
      products,
      totalCount,
      queryDto
    );

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Productos obtenidos exitosamente',
        en: 'Products retrieved successfully',
      },
      data: paginationResult,
    };
  }

  async findOne(id: string, branchId: string) {
    const product = await this.productRepository.findOne({
      where: { id, branchId },
      relations: ['category', 'subcategory', 'defaultSupplier'],
    });

    if (!product) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Producto no encontrado',
          en: 'Product not found',
        },
      });
    }

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Producto obtenido exitosamente',
        en: 'Product retrieved successfully',
      },
      data: product,
    };
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    branchId: string
  ) {
    const product = await this.productRepository.findOne({
      where: { id, branchId },
    });

    if (!product) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Producto no encontrado',
          en: 'Product not found',
        },
      });
    }

    if (updateProductDto.code && updateProductDto.code !== product.code) {
      const existingProduct = await this.productRepository.findOne({
        where: {
          code: updateProductDto.code,
          branchId,
        },
      });

      if (existingProduct) {
        throw new ConflictException({
          statusCode: 409,
          success: false,
          message: {
            es: 'Ya existe un producto con este código en esta sucursal',
            en: 'A product with this code already exists in this branch',
          },
        });
      }
    }

    await this.validateRelatedEntities(updateProductDto, branchId);

    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productRepository.save(product);

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Producto actualizado exitosamente',
        en: 'Product updated successfully',
      },
      data: updatedProduct,
    };
  }

  async remove(id: string, branchId: string) {
    const product = await this.productRepository.findOne({
      where: { id, branchId },
    });

    if (!product) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Producto no encontrado',
          en: 'Product not found',
        },
      });
    }

    await this.productRepository.remove(product);

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Producto eliminado exitosamente',
        en: 'Product deleted successfully',
      },
    };
  }

  private async validateRelatedEntities(
    dto: CreateProductDto | UpdateProductDto,
    branchId: string
  ) {
    if (dto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId, branchId },
      });

      if (!category) {
        throw new BadRequestException({
          statusCode: 400,
          success: false,
          message: {
            es: 'La categoría no existe o no pertenece a esta sucursal',
            en: 'Category does not exist or does not belong to this branch',
          },
        });
      }
    }

    if (dto.subcategoryId) {
      const subcategory = await this.subcategoryRepository.findOne({
        where: { id: dto.subcategoryId, branchId },
      });

      if (!subcategory) {
        throw new BadRequestException({
          statusCode: 400,
          success: false,
          message: {
            es: 'La subcategoría no existe o no pertenece a esta sucursal',
            en: 'Subcategory does not exist or does not belong to this branch',
          },
        });
      }

      if (dto.categoryId && subcategory.categoryId !== dto.categoryId) {
        throw new BadRequestException({
          statusCode: 400,
          success: false,
          message: {
            es: 'La subcategoría no pertenece a la categoría seleccionada',
            en: 'Subcategory does not belong to the selected category',
          },
        });
      }
    }

    if (dto.defaultSupplierId) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: dto.defaultSupplierId, branchId },
      });

      if (!supplier) {
        throw new BadRequestException({
          statusCode: 400,
          success: false,
          message: {
            es: 'El proveedor no existe o no pertenece a esta sucursal',
            en: 'Supplier does not exist or does not belong to this branch',
          },
        });
      }
    }
  }
}
