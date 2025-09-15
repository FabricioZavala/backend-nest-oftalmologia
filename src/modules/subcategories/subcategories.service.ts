import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subcategory } from './entities/subcategory.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateSubcategoryDto } from './dtos/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dtos/update-subcategory.dto';
import { QuerySubcategoryDto } from './dtos/query-subcategory.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';

@Injectable()
export class SubcategoriesService {
  constructor(
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>
  ) {}

  async create(createSubcategoryDto: CreateSubcategoryDto, branchId: string) {
    const category = await this.categoryRepository.findOne({
      where: {
        id: createSubcategoryDto.categoryId,
        branchId,
      },
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

    const existingSubcategory = await this.subcategoryRepository.findOne({
      where: {
        name: createSubcategoryDto.name,
        categoryId: createSubcategoryDto.categoryId,
        branchId,
      },
    });

    if (existingSubcategory) {
      throw new ConflictException({
        statusCode: 409,
        success: false,
        message: {
          es: 'Ya existe una subcategoría con este nombre en esta categoría',
          en: 'A subcategory with this name already exists in this category',
        },
      });
    }

    const subcategory = this.subcategoryRepository.create({
      ...createSubcategoryDto,
      branchId,
    });

    const savedSubcategory = await this.subcategoryRepository.save(subcategory);

    return {
      statusCode: 201,
      success: true,
      message: {
        es: 'Subcategoría creada exitosamente',
        en: 'Subcategory created successfully',
      },
      data: savedSubcategory,
    };
  }

  async findAll(queryDto: QuerySubcategoryDto, branchId: string) {
    const { skip, take } = PaginationUtil.getSkipAndTake(queryDto);
    const queryBuilder = this.subcategoryRepository
      .createQueryBuilder('subcategory')
      .leftJoinAndSelect('subcategory.category', 'category');

    queryBuilder.where('subcategory.branchId = :branchId', { branchId });

    if (queryDto.categoryId) {
      queryBuilder.andWhere('subcategory.categoryId = :categoryId', {
        categoryId: queryDto.categoryId,
      });
    }

    if (queryDto.search) {
      queryBuilder.andWhere('subcategory.name ILIKE :search', {
        search: `%${queryDto.search}%`,
      });
    }

    if (queryDto.isActive !== undefined) {
      queryBuilder.andWhere('subcategory.isActive = :isActive', {
        isActive: queryDto.isActive,
      });
    }

    queryBuilder.orderBy('subcategory.createdAt', 'DESC').skip(skip).take(take);

    const [subcategories, totalCount] = await queryBuilder.getManyAndCount();

    const paginationResult = PaginationUtil.paginate(
      subcategories,
      totalCount,
      queryDto
    );

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Subcategorías obtenidas exitosamente',
        en: 'Subcategories retrieved successfully',
      },
      data: paginationResult,
    };
  }

  async findOne(id: string, branchId: string) {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id, branchId },
      relations: ['category'],
    });

    if (!subcategory) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Subcategoría no encontrada',
          en: 'Subcategory not found',
        },
      });
    }

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Subcategoría obtenida exitosamente',
        en: 'Subcategory retrieved successfully',
      },
      data: subcategory,
    };
  }

  async update(
    id: string,
    updateSubcategoryDto: UpdateSubcategoryDto,
    branchId: string
  ) {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id, branchId },
    });

    if (!subcategory) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Subcategoría no encontrada',
          en: 'Subcategory not found',
        },
      });
    }

    if (updateSubcategoryDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: {
          id: updateSubcategoryDto.categoryId,
          branchId,
        },
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

    if (
      updateSubcategoryDto.name &&
      (updateSubcategoryDto.name !== subcategory.name ||
        (updateSubcategoryDto.categoryId &&
          updateSubcategoryDto.categoryId !== subcategory.categoryId))
    ) {
      const categoryIdToCheck =
        updateSubcategoryDto.categoryId || subcategory.categoryId;

      const existingSubcategory = await this.subcategoryRepository.findOne({
        where: {
          name: updateSubcategoryDto.name,
          categoryId: categoryIdToCheck,
          branchId,
        },
      });

      if (existingSubcategory && existingSubcategory.id !== id) {
        throw new ConflictException({
          statusCode: 409,
          success: false,
          message: {
            es: 'Ya existe una subcategoría con este nombre en esta categoría',
            en: 'A subcategory with this name already exists in this category',
          },
        });
      }
    }

    Object.assign(subcategory, updateSubcategoryDto);
    const updatedSubcategory = await this.subcategoryRepository.save(
      subcategory
    );

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Subcategoría actualizada exitosamente',
        en: 'Subcategory updated successfully',
      },
      data: updatedSubcategory,
    };
  }

  async remove(id: string, branchId: string) {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id, branchId },
    });

    if (!subcategory) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Subcategoría no encontrada',
          en: 'Subcategory not found',
        },
      });
    }

    await this.subcategoryRepository.remove(subcategory);

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Subcategoría eliminada exitosamente',
        en: 'Subcategory deleted successfully',
      },
    };
  }
}
