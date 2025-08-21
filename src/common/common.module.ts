import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermission } from '../modules/roles-permissions/entities/role-permission.entity';
import { Permission } from '../modules/roles-permissions/entities/permission.entity';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RolePermission, Permission])],
  providers: [RolesGuard, PermissionsGuard],
  exports: [RolesGuard, PermissionsGuard],
})
export class CommonModule {}
