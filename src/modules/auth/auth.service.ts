import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    this.logger.log(`Login attempt for identifier: ${identifier}`);

    // Find user by username or email
    const user = await this.userRepository.findOne({
      where: [{ username: identifier }, { email: identifier }],
      relations: ['role'],
    });

    if (!user) {
      this.logger.warn(`User not found for identifier: ${identifier}`);
      throw new UnauthorizedException({
        messageKey: 'ERROR.INVALID_CREDENTIALS',
      });
    }

    this.logger.log(
      `User found: ${user.username} (${user.email}) - Role: ${
        user.role?.roleName || 'No role'
      }`
    );

    // Check if user is active and not locked
    if (!user.isActive) {
      this.logger.warn(`Inactive user login attempt: ${identifier}`);
      throw new UnauthorizedException({
        messageKey: 'ERROR.UNAUTHORIZED',
      });
    }

    if (user.isLocked) {
      this.logger.warn(`Locked user login attempt: ${identifier}`);
      throw new UnauthorizedException({
        messageKey: 'ERROR.UNAUTHORIZED',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${identifier}`);
      // Increment failed login attempts
      await this.userRepository.update(user.id, {
        failedLoginAttempts: user.failedLoginAttempts + 1,
      });

      // Lock user after 5 failed attempts
      if (user.failedLoginAttempts >= 4) {
        this.logger.warn(`User locked due to failed attempts: ${identifier}`);
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
          address: user.address,
          documentNumber: user.documentNumber,
          dateOfBirth: user.dateOfBirth,
          homePhone: user.homePhone,
          mobilePhone: user.mobilePhone,
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
      relations: [
        'role',
        'role.rolePermissions',
        'role.rolePermissions.permission',
      ],
    });

    if (!user) {
      throw new UnauthorizedException({
        messageKey: 'ERROR.UNAUTHORIZED',
      });
    }

    // Extraer los IDs de permisos activos
    const permissionIds =
      user.role?.rolePermissions
        ?.filter((rp) => rp.isEnabled && rp.permission.isActive)
        ?.map((rp) => rp.permission.id) || [];

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
        address: user.address,
        documentNumber: user.documentNumber,
        dateOfBirth: user.dateOfBirth,
        homePhone: user.homePhone,
        mobilePhone: user.mobilePhone,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        permissionIds: permissionIds, // ⭐ Nuevo campo con IDs de permisos
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

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'User not found',
      });
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException({
        messageKey: 'ERROR.INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    // Encriptar nueva contraseña
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    await this.userRepository.update(userId, {
      passwordHash,
    });

    return {
      messageKey: 'AUTH.PASSWORD_CHANGED',
      message: 'Password changed successfully',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Por seguridad, siempre devolvemos el mismo mensaje
      return {
        messageKey: 'AUTH.RESET_EMAIL_SENT',
        message: 'If the email exists in our system, a reset link has been sent',
      };
    }

    // Generar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token en el usuario
    await this.userRepository.update(user.id, {
      resetToken,
      resetTokenExpiry,
    });

    // Enviar email (simplificado para demostración)
    await this.sendResetEmail(user.email, resetToken);

    return {
      messageKey: 'AUTH.RESET_EMAIL_SENT',
      message: 'If the email exists in our system, a reset link has been sent',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: { 
        resetToken: token,
      },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException({
        messageKey: 'ERROR.INVALID_OR_EXPIRED_TOKEN',
        message: 'Invalid or expired reset token',
      });
    }

    // Encriptar nueva contraseña
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña y limpiar token
    await this.userRepository.update(user.id, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return {
      messageKey: 'AUTH.PASSWORD_RESET',
      message: 'Password has been reset successfully',
    };
  }

  private async sendResetEmail(email: string, token: string) {
    try {
      const resetUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:4200'}/auth/reset-password?token=${token}`;
      
      // Configurar el transporter de nodemailer
      const transporter = nodemailer.createTransport({
        host: this.configService.get('MAIL_HOST') || 'smtp.gmail.com',
        port: parseInt(this.configService.get('MAIL_PORT')) || 587,
        secure: this.configService.get('MAIL_SECURE') === 'true' || false,
        auth: {
          user: this.configService.get('MAIL_USER'),
          pass: this.configService.get('MAIL_PASS'),
        },
      });

      // Si no hay configuración de correo, solo logear la URL
      if (!this.configService.get('MAIL_USER') || !this.configService.get('MAIL_PASS')) {
        this.logger.log(`🔗 Reset password URL for ${email}: ${resetUrl}`);
        this.logger.warn('⚠️  Email configuration not found. Add MAIL_USER and MAIL_PASS to environment variables to send actual emails.');
        return;
      }

      // Enviar el correo
      const mailOptions = {
        from: this.configService.get('MAIL_USER'),
        to: email,
        subject: 'Restablecer contraseña - Sistema Oftalmología',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Restablecer contraseña</h2>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Restablecer contraseña
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Este enlace expirará en 1 hora por razones de seguridad.
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      this.logger.log(`✅ Reset email sent successfully to ${email}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to send reset email to ${email}:`, error);
      // Log the reset URL as fallback
      const resetUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:4200'}/auth/reset-password?token=${token}`;
      this.logger.log(`🔗 Fallback reset URL for ${email}: ${resetUrl}`);
    }
  }
}
