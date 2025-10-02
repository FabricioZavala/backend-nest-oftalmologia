import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dtos/create-branch.dto';
import { UpdateBranchDto } from './dtos/update-branch.dto';
import { QueryBranchDto } from './dtos/query-branch.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>
  ) {}

  async create(createBranchDto: CreateBranchDto) {
    const existingByName = await this.branchRepository.findOne({
      where: { name: createBranchDto.name },
    });

    if (existingByName) {
      throw new ConflictException({
        statusCode: 409,
        success: false,
        message: {
          es: 'Ya existe una sucursal con este nombre',
          en: 'A branch with this name already exists',
        },
      });
    }

    const existingByCode = await this.branchRepository.findOne({
      where: { code: createBranchDto.code },
    });

    if (existingByCode) {
      throw new ConflictException({
        statusCode: 409,
        success: false,
        message: {
          es: 'Ya existe una sucursal con este código',
          en: 'A branch with this code already exists',
        },
      });
    }

    const branch = this.branchRepository.create(createBranchDto);
    const savedBranch = await this.branchRepository.save(branch);

    return {
      statusCode: 201,
      success: true,
      message: {
        es: 'Sucursal creada exitosamente',
        en: 'Branch created successfully',
      },
      data: savedBranch,
    };
  }

  async findAll(queryDto: QueryBranchDto) {
    const { skip, take } = PaginationUtil.getSkipAndTake(queryDto);
    const queryBuilder = this.branchRepository.createQueryBuilder('branch');

    if (queryDto.search) {
      queryBuilder.where(
        'branch.name ILIKE :search OR branch.code ILIKE :search OR branch.city ILIKE :search',
        { search: `%${queryDto.search}%` }
      );
    }

    if (queryDto.name) {
      queryBuilder.andWhere('branch.name ILIKE :name', {
        name: `%${queryDto.name}%`,
      });
    }

    if (queryDto.code) {
      queryBuilder.andWhere('branch.code ILIKE :code', {
        code: `%${queryDto.code}%`,
      });
    }

    if (queryDto.city) {
      queryBuilder.andWhere('branch.city ILIKE :city', {
        city: `%${queryDto.city}%`,
      });
    }

    if (queryDto.phone) {
      queryBuilder.andWhere('branch.phone ILIKE :phone', {
        phone: `%${queryDto.phone}%`,
      });
    }

    if (queryDto.corporateEmail) {
      queryBuilder.andWhere('branch.corporateEmail ILIKE :corporateEmail', {
        corporateEmail: `%${queryDto.corporateEmail}%`,
      });
    }

    if (queryDto.address) {
      queryBuilder.andWhere('branch.address ILIKE :address', {
        address: `%${queryDto.address}%`,
      });
    }

    if (queryDto.isActive !== undefined) {
      queryBuilder.andWhere('branch.isActive = :isActive', {
        isActive: queryDto.isActive,
      });
    }

    queryBuilder.orderBy('branch.createdAt', 'DESC').skip(skip).take(take);

    const [branches, totalCount] = await queryBuilder.getManyAndCount();

    const paginationResult = PaginationUtil.paginate(
      branches,
      totalCount,
      queryDto
    );

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Sucursales obtenidas exitosamente',
        en: 'Branches retrieved successfully',
      },
      data: paginationResult,
    };
  }

  async findOne(id: string) {
    const branch = await this.branchRepository.findOne({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Sucursal no encontrada',
          en: 'Branch not found',
        },
      });
    }

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Sucursal obtenida exitosamente',
        en: 'Branch retrieved successfully',
      },
      data: branch,
    };
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    const branch = await this.branchRepository.findOne({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Sucursal no encontrada',
          en: 'Branch not found',
        },
      });
    }

    if (updateBranchDto.name && updateBranchDto.name !== branch.name) {
      const existingByName = await this.branchRepository.findOne({
        where: { name: updateBranchDto.name },
      });

      if (existingByName) {
        throw new ConflictException({
          statusCode: 409,
          success: false,
          message: {
            es: 'Ya existe una sucursal con este nombre',
            en: 'A branch with this name already exists',
          },
        });
      }
    }

    if (updateBranchDto.code && updateBranchDto.code !== branch.code) {
      const existingByCode = await this.branchRepository.findOne({
        where: { code: updateBranchDto.code },
      });

      if (existingByCode) {
        throw new ConflictException({
          statusCode: 409,
          success: false,
          message: {
            es: 'Ya existe una sucursal con este código',
            en: 'A branch with this code already exists',
          },
        });
      }
    }

    Object.assign(branch, updateBranchDto);
    const updatedBranch = await this.branchRepository.save(branch);

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Sucursal actualizada exitosamente',
        en: 'Branch updated successfully',
      },
      data: updatedBranch,
    };
  }

  async remove(id: string) {
    const branch = await this.branchRepository.findOne({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Sucursal no encontrada',
          en: 'Branch not found',
        },
      });
    }

    await this.branchRepository.remove(branch);

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Sucursal eliminada exitosamente',
        en: 'Branch deleted successfully',
      },
    };
  }
}
