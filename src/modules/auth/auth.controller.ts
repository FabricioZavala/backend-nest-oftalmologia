import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  ValidationPipe,
  Logger,
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
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly userPermissionsService: UserPermissionsService
  ) {}
  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    this.logger.log(`Login attempt for: ${loginDto.identifier}`);
    const result = await this.authService.login(loginDto);
    this.logger.log(
      `Login ${result.data ? 'successful' : 'failed'} for: ${
        loginDto.identifier
      }`
    );
    return result;
  }
  @Post('refresh')
  async refresh(@Body(ValidationPipe) refreshDto: RefreshDto) {
    this.logger.log('Token refresh attempt');
    return this.authService.refresh(refreshDto);
  }
  @Get('get-me-user')
  @UseGuards(AuthGuard('jwt'))
  async getMeUser(@CurrentUser() user: User) {
    this.logger.log(`Getting user info for ID: ${user.id}`);
    return this.authService.getMeUser(user.id);
  }
  @Get('profile-with-permissions')
  @UseGuards(AuthGuard('jwt'))
  async getProfileWithPermissions(@CurrentUser() user: User) {
    this.logger.log(`Getting permissions for user ID: ${user.id}`);
    const result = await this.userPermissionsService.getUserPermissions(
      user.id
    );
    this.logger.log(`User ${user.id} permissions loaded successfully`);
    return result;
  }
}
