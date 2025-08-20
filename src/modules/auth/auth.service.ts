import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    // Find user by username or email
    const user = await this.userRepository.findOne({
      where: [{ username: identifier }, { email: identifier }],
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException({
        messageKey: 'ERROR.INVALID_CREDENTIALS',
      });
    }

    // Check if user is active and not locked
    if (!user.isActive) {
      throw new UnauthorizedException({
        messageKey: 'ERROR.UNAUTHORIZED',
      });
    }

    if (user.isLocked) {
      throw new UnauthorizedException({
        messageKey: 'ERROR.UNAUTHORIZED',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.userRepository.update(user.id, {
        failedLoginAttempts: user.failedLoginAttempts + 1,
      });

      // Lock user after 5 failed attempts
      if (user.failedLoginAttempts >= 4) {
        await this.userRepository.update(user.id, {
          isLocked: true,
        });
      }

      throw new UnauthorizedException({
        messageKey: 'ERROR.INVALID_CREDENTIALS',
      });
    }

    // Reset failed login attempts and update last login
    await this.userRepository.update(user.id, {
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      messageKey: 'AUTH.LOGIN.SUCCESS',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profilePhoto: user.profilePhoto,
        },
        ...tokens,
      },
    };
  }

  async refresh(refreshDto: RefreshDto) {
    const { refreshToken } = refreshDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['role'],
      });

      if (!user || !user.isActive || user.isLocked) {
        throw new UnauthorizedException({
          messageKey: 'ERROR.UNAUTHORIZED',
        });
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return {
        messageKey: 'AUTH.REFRESH.SUCCESS',
        data: tokens,
      };
    } catch (error) {
      throw new UnauthorizedException({
        messageKey: 'ERROR.INVALID_TOKEN',
      });
    }
  }

  async getMeUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException({
        messageKey: 'ERROR.UNAUTHORIZED',
      });
    }

    return {
      messageKey: 'AUTH.GET_ME.SUCCESS',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePhoto: user.profilePhoto,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
    };

    const refreshPayload = {
      sub: user.id,
      username: user.username,
      tokenType: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    };
  }
}
