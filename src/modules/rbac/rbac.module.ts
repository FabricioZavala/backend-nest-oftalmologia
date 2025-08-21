import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Role } from './entities/role.entity';
import { Module as ModuleEntity } from './entities/module.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { RoleModule } from './entities/role-module.entity';

// Services and Controllers
import { RolesService } from './roles/roles.service';
import { RolesController } from './roles/roles.controller';
import { ModulesService } from './modules/modules.service';
import { ModulesController } from './modules/modules.controller';
import { PermissionsService } from './permissions/permissions.service';
import { PermissionsController } from './permissions/permissions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      ModuleEntity,
      Permission,
      RolePermission,
      RoleModule,
    ]),
  ],
  controllers: [RolesController, ModulesController, PermissionsController],
  providers: [RolesService, ModulesService, PermissionsService],
  exports: [TypeOrmModule, RolesService, ModulesService, PermissionsService],
})
export class RolesPermissionsModule {}
