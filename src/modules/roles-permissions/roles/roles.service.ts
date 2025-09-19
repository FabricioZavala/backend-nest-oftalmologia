import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { QueryRoleDto } from './dtos/query-role.dto';
import { PaginationUtil } from '../../../common/utils/pagination.util';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const { roleName } = createRoleDto;

    const existingRole = await this.roleRepository.findOne({
      where: { roleName },
    });

    if (existingRole) {
      throw new ConflictException({
        messageKey: 'ERROR.VALIDATION',
        message: 'Role name already exists',
      });
    }

    const role = this.roleRepository.create(createRoleDto);
    const savedRole = await this.roleRepository.save(role);

    return {
      messageKey: 'ROLE.CREATED',
      data: savedRole,
    };
  }

  async findAll(queryDto: QueryRoleDto) {
    const { page, limit, search, isActive } = queryDto;
    const { skip, take } = PaginationUtil.getSkipAndTake({ page, limit });

    const queryBuilder = this.roleRepository.createQueryBuilder('role');

    if (search) {
      queryBuilder.andWhere(
        '(role.roleName ILIKE :search OR role.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('role.isActive = :isActive', { isActive });
    }

    const totalCount = await queryBuilder.getCount();

    const roles = await queryBuilder
      .orderBy('role.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getMany();

    const paginatedResult = PaginationUtil.paginate(roles, totalCount, {
      page,
      limit,
    });

    return {
      messageKey: 'ROLE.FOUND',
      data: paginatedResult,
    };
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    return {
      messageKey: 'ROLE.FETCHED',
      data: role,
    };
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    const { roleName } = updateRoleDto;

    if (roleName && roleName !== role.roleName) {
      const existingRole = await this.roleRepository.findOne({
        where: { roleName },
      });
      if (existingRole) {
        throw new ConflictException({
          messageKey: 'ERROR.VALIDATION',
          message: 'Role name already exists',
        });
      }
    }

    await this.roleRepository.update(id, updateRoleDto);

    const updatedRole = await this.roleRepository.findOne({
      where: { id },
    });

    return {
      messageKey: 'ROLE.UPDATED',
      data: updatedRole,
    };
  }

  async remove(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    if (role.users && role.users.length > 0) {
      throw new ConflictException({
        messageKey: 'ERROR.VALIDATION',
        message: 'Cannot delete role with associated users',
      });
    }

    await this.roleRepository.remove(role);

    return {
      messageKey: 'ROLE.DELETED',
      data: { id },
    };
  }

  async findByName(roleName: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { roleName },
    });
  }
}
