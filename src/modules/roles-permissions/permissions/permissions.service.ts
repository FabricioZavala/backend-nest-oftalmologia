import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { Module } from '../entities/module.entity';
import { CreatePermissionDto } from './dtos/create-permission.dto';
import { UpdatePermissionDto } from './dtos/update-permission.dto';
import { QueryPermissionDto } from './dtos/query-permission.dto';
import { PaginationUtil } from '../../../common/utils/pagination.util';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Module)
    private moduleRepository: Repository<Module>
  ) {}

  async create(createPermissionDto: CreatePermissionDto) {
    const { permissionName, moduleId } = createPermissionDto;

    // Check if module exists
    const module = await this.moduleRepository.findOne({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Module not found',
      });
    }

    // Check if permission name already exists within the same module
    const existingPermission = await this.permissionRepository.findOne({
      where: { permissionName, moduleId },
    });

    if (existingPermission) {
      throw new ConflictException({
        messageKey: 'ERROR.VALIDATION',
        message: 'Permission name already exists in this module',
      });
    }

    const permission = this.permissionRepository.create(createPermissionDto);
    const savedPermission = await this.permissionRepository.save(permission);

    // Load the saved permission with module relation
    const permissionWithModule = await this.permissionRepository.findOne({
      where: { id: savedPermission.id },
      relations: ['module'],
    });

    return {
      messageKey: 'PERMISSION.CREATED',
      data: permissionWithModule,
    };
  }

  async findAll(queryDto: QueryPermissionDto) {
    const { page, limit, search, moduleId, isActive } = queryDto;
    const { skip, take } = PaginationUtil.getSkipAndTake({ page, limit });

    const queryBuilder = this.permissionRepository
      .createQueryBuilder('permission')
      .leftJoinAndSelect('permission.module', 'module');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(permission.permissionName ILIKE :search OR permission.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (moduleId) {
      queryBuilder.andWhere('permission.moduleId = :moduleId', { moduleId });
    }

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('permission.isActive = :isActive', { isActive });
    }

    // Get total count
    const totalCount = await queryBuilder.getCount();

    // Apply pagination and get results
    const permissions = await queryBuilder
      .orderBy('permission.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getMany();

    const paginatedResult = PaginationUtil.paginate(permissions, totalCount, {
      page,
      limit,
    });

    return {
      messageKey: 'PERMISSION.FOUND',
      data: paginatedResult,
    };
  }

  async findOne(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['module'],
    });

    if (!permission) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    return {
      messageKey: 'PERMISSION.FETCHED',
      data: permission,
    };
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    const { permissionName, moduleId } = updatePermissionDto;

    // If moduleId is being updated, check if it exists
    if (moduleId && moduleId !== permission.moduleId) {
      const module = await this.moduleRepository.findOne({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException({
          messageKey: 'ERROR.NOT_FOUND',
          message: 'Module not found',
        });
      }
    }

    // Check for permission name conflict within the target module
    if (permissionName || moduleId) {
      const targetModuleId = moduleId || permission.moduleId;
      const targetPermissionName = permissionName || permission.permissionName;

      if (
        targetModuleId !== permission.moduleId ||
        targetPermissionName !== permission.permissionName
      ) {
        const existingPermission = await this.permissionRepository.findOne({
          where: {
            permissionName: targetPermissionName,
            moduleId: targetModuleId,
          },
        });

        if (existingPermission && existingPermission.id !== id) {
          throw new ConflictException({
            messageKey: 'ERROR.VALIDATION',
            message: 'Permission name already exists in this module',
          });
        }
      }
    }

    await this.permissionRepository.update(id, updatePermissionDto);

    const updatedPermission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['module'],
    });

    return {
      messageKey: 'PERMISSION.UPDATED',
      data: updatedPermission,
    };
  }

  async remove(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['rolePermissions'],
    });

    if (!permission) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    // Check if permission has associated role permissions
    if (permission.rolePermissions && permission.rolePermissions.length > 0) {
      throw new ConflictException({
        messageKey: 'ERROR.VALIDATION',
        message: 'Cannot delete permission with associated role permissions',
      });
    }

    await this.permissionRepository.remove(permission);

    return {
      messageKey: 'PERMISSION.DELETED',
      data: { id },
    };
  }
}
