import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { QueryCategoryDto } from './dtos/query-category.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>
  ) {}

  async create(createCategoryDto: CreateCategoryDto, branchId: string) {
    const existingCategory = await this.categoryRepository.findOne({
      where: {
        name: createCategoryDto.name,
        branchId,
      },
    });

    if (existingCategory) {
      throw new ConflictException({
        statusCode: 409,
        success: false,
        message: {
          es: 'Ya existe una categoría con este nombre en esta sucursal',
          en: 'A category with this name already exists in this branch',
        },
      });
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      branchId,
    });

    const savedCategory = await this.categoryRepository.save(category);

    return {
      statusCode: 201,
      success: true,
      message: {
        es: 'Categoría creada exitosamente',
        en: 'Category created successfully',
      },
      data: savedCategory,
    };
  }

  async findAll(queryDto: QueryCategoryDto, branchId: string) {
    const { skip, take } = PaginationUtil.getSkipAndTake(queryDto);
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    queryBuilder.where('category.branchId = :branchId', { branchId });

    if (queryDto.search) {
      queryBuilder.andWhere('category.name ILIKE :search', {
        search: `%${queryDto.search}%`,
      });
    }

    if (queryDto.isActive !== undefined) {
      queryBuilder.andWhere('category.isActive = :isActive', {
        isActive: queryDto.isActive,
      });
    }

    queryBuilder.orderBy('category.createdAt', 'DESC').skip(skip).take(take);

    const [categories, totalCount] = await queryBuilder.getManyAndCount();

    const paginationResult = PaginationUtil.paginate(
      categories,
      totalCount,
      queryDto
    );

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Categorías obtenidas exitosamente',
        en: 'Categories retrieved successfully',
      },
      data: paginationResult,
    };
  }

  async findOne(id: string, branchId: string) {
    const category = await this.categoryRepository.findOne({
      where: { id, branchId },
    });

    if (!category) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Categoría no encontrada',
          en: 'Category not found',
        },
      });
    }

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Categoría obtenida exitosamente',
        en: 'Category retrieved successfully',
      },
      data: category,
    };
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    branchId: string
  ) {
    const category = await this.categoryRepository.findOne({
      where: { id, branchId },
    });

    if (!category) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Categoría no encontrada',
          en: 'Category not found',
        },
      });
    }

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: {
          name: updateCategoryDto.name,
          branchId,
        },
      });

      if (existingCategory) {
        throw new ConflictException({
          statusCode: 409,
          success: false,
          message: {
            es: 'Ya existe una categoría con este nombre en esta sucursal',
            en: 'A category with this name already exists in this branch',
          },
        });
      }
    }

    Object.assign(category, updateCategoryDto);
    const updatedCategory = await this.categoryRepository.save(category);

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Categoría actualizada exitosamente',
        en: 'Category updated successfully',
      },
      data: updatedCategory,
    };
  }

  async remove(id: string, branchId: string) {
    const category = await this.categoryRepository.findOne({
      where: { id, branchId },
    });

    if (!category) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Categoría no encontrada',
          en: 'Category not found',
        },
      });
    }

    await this.categoryRepository.remove(category);

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Categoría eliminada exitosamente',
        en: 'Category deleted successfully',
      },
    };
  }
}
