import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { AssignPermissionToRoleDto } from '../dtos/assign-permission-role.dto';

@Injectable()
export class RolePermissionsService {
  constructor(
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>
  ) {}

  async assignPermissionToRole(assignDto: AssignPermissionToRoleDto) {
    const { roleId, permissionId, isEnabled = true } = assignDto;

    // Verificar que el rol existe
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Role not found',
      });
    }

    // Verificar que el permiso existe
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Permission not found',
      });
    }

    // Verificar si ya existe la asignación
    let existingAssignment = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (existingAssignment) {
      // Actualizar la asignación existente
      existingAssignment.isEnabled = isEnabled;
      await this.rolePermissionRepository.save(existingAssignment);

      return {
        messageKey: 'ROLE_PERMISSION.UPDATED',
        data: existingAssignment,
      };
    } else {
      // Crear nueva asignación
      const newAssignment = this.rolePermissionRepository.create({
        roleId,
        permissionId,
        isEnabled,
      });

      const savedAssignment = await this.rolePermissionRepository.save(
        newAssignment
      );

      return {
        messageKey: 'ROLE_PERMISSION.ASSIGNED',
        data: savedAssignment,
      };
    }
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    const assignment = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (!assignment) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Assignment not found',
      });
    }

    await this.rolePermissionRepository.remove(assignment);

    return {
      messageKey: 'ROLE_PERMISSION.REMOVED',
    };
  }

  async getRolePermissions(roleId: string) {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Role not found',
      });
    }

    const rolePermissions = await this.rolePermissionRepository
      .createQueryBuilder('rp')
      .leftJoinAndSelect('rp.permission', 'permission')
      .leftJoinAndSelect('permission.module', 'module')
      .where('rp.roleId = :roleId', { roleId })
      .getMany();

    return {
      messageKey: 'ROLE_PERMISSION.FOUND',
      data: {
        role,
        permissions: rolePermissions,
      },
    };
  }

  async getAllRolePermissions() {
    const rolePermissions = await this.rolePermissionRepository
      .createQueryBuilder('rp')
      .leftJoinAndSelect('rp.role', 'role')
      .leftJoinAndSelect('rp.permission', 'permission')
      .leftJoinAndSelect('permission.module', 'module')
      .getMany();

    return {
      messageKey: 'ROLE_PERMISSION.FOUND',
      data: rolePermissions,
    };
  }
}
