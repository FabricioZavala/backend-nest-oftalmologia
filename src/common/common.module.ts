import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RolePermission } from '../modules/roles-permissions/entities/role-permission.entity';
import { Permission } from '../modules/roles-permissions/entities/permission.entity';
import { Branch } from '../modules/branches/entities/branch.entity';
import { User } from '../modules/users/entities/user.entity';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { EmailUtil } from './utils/email.util';
import { BranchFilterMiddleware } from './middleware/branch-filter.middleware';
import { AdminBranchSessionService } from './services/admin-branch-session.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([RolePermission, Permission, Branch, User]),
    JwtModule.register({}),
  ],
  providers: [
    RolesGuard,
    PermissionsGuard,
    EmailUtil,
    BranchFilterMiddleware,
    AdminBranchSessionService,
  ],
  exports: [
    RolesGuard,
    PermissionsGuard,
    EmailUtil,
    BranchFilterMiddleware,
    AdminBranchSessionService,
  ],
})
export class CommonModule {}
