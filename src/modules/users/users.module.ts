import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { RolesPermissionsModule } from '../roles-permissions/roles-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    RolesPermissionsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
