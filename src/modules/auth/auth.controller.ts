import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserPermissionsService } from '../roles-permissions/services/user-permissions.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userPermissionsService: UserPermissionsService
  ) {}

  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  async refresh(@Body(ValidationPipe) refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto);
  }

  @Get('get-me-user')
  @UseGuards(AuthGuard('jwt'))
  async getMeUser(@CurrentUser() user: User) {
    return this.authService.getMeUser(user.id);
  }

  @Get('profile-with-permissions')
  @UseGuards(AuthGuard('jwt'))
  async getProfileWithPermissions(@CurrentUser() user: User) {
    return this.userPermissionsService.getUserPermissions(user.id);
  }
}
