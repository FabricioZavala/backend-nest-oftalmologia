import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateCurrentUserDto } from './dtos/update-current-user.dto';
import { QueryUserDto } from './dtos/query-user.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';
import { FilesService } from '../files/files.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private filesService: FilesService
  ) {}

  async create(createUserDto: CreateUserDto) {
    const {
      username,
      email,
      password,
      adress,
      document_number,
      home_phone,
      mobile_phone,
      ...userData
    } = createUserDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException({
          messageKey: 'ERROR.VALIDATION',
          message: 'Username already exists',
        });
      }
      if (existingUser.email === email) {
        throw new ConflictException({
          messageKey: 'ERROR.VALIDATION',
          message: 'Email already exists',
        });
      }
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userDataMapped = {
      username,
      email,
      passwordHash,
      address: adress || userData.address,
      documentNumber: document_number || userData.documentNumber,
      homePhone: home_phone || userData.homePhone,
      mobilePhone: mobile_phone || userData.mobilePhone,
      ...userData,
    };

    const user = this.userRepository.create(userDataMapped);

    const savedUser = await this.userRepository.save(user);

    const { passwordHash: _, ...userWithoutPassword } = savedUser;

    return {
      messageKey: 'USER.CREATED',
      data: userWithoutPassword,
    };
  }

  async findAll(queryDto: QueryUserDto) {
    const {
      page,
      limit,
      search,
      firstName,
      lastName,
      email,
      documentNumber,
      mobilePhone,
      address,
      roleId,
      branchId,
      isActive,
      isLocked,
    } = queryDto;

    const { skip, take } = PaginationUtil.getSkipAndTake({ page, limit });

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.branch', 'branch')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.profilePhoto',
        'user.address',
        'user.documentNumber',
        'user.dateOfBirth',
        'user.homePhone',
        'user.mobilePhone',
        'user.isActive',
        'user.isLocked',
        'user.lastLoginAt',
        'user.createdAt',
        'user.updatedAt',
        'role.id',
        'role.roleName',
        'role.description',
        'branch.id',
        'branch.name',
        'branch.code',
      ]);

    if (search) {
      queryBuilder.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.documentNumber ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (firstName) {
      queryBuilder.andWhere('user.firstName ILIKE :firstName', {
        firstName: `%${firstName}%`,
      });
    }

    if (lastName) {
      queryBuilder.andWhere('user.lastName ILIKE :lastName', {
        lastName: `%${lastName}%`,
      });
    }

    if (email) {
      queryBuilder.andWhere('user.email ILIKE :email', { email: `%${email}%` });
    }

    if (documentNumber) {
      queryBuilder.andWhere('user.documentNumber ILIKE :documentNumber', {
        documentNumber: `%${documentNumber}%`,
      });
    }

    if (mobilePhone) {
      queryBuilder.andWhere('user.mobilePhone ILIKE :mobilePhone', {
        mobilePhone: `%${mobilePhone}%`,
      });
    }

    if (address) {
      queryBuilder.andWhere('user.address ILIKE :address', {
        address: `%${address}%`,
      });
    }

    if (roleId) {
      queryBuilder.andWhere('user.roleId = :roleId', { roleId });
    }

    if (branchId) {
      queryBuilder.andWhere('user.branchId = :branchId', { branchId });
    }

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (typeof isLocked === 'boolean') {
      queryBuilder.andWhere('user.isLocked = :isLocked', { isLocked });
    }

    const totalCount = await queryBuilder.getCount();

    const users = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getMany();

    const paginatedResult = PaginationUtil.paginate(users, totalCount, {
      page,
      limit,
    });

    return {
      messageKey: 'USER.FOUND',
      data: paginatedResult,
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'branch'],
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        address: true,
        documentNumber: true,
        dateOfBirth: true,
        homePhone: true,
        mobilePhone: true,
        isActive: true,
        isLocked: true,
        failedLoginAttempts: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          id: true,
          roleName: true,
          description: true,
        },
        branch: {
          id: true,
          name: true,
          code: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    return {
      messageKey: 'USER.FETCHED',
      data: user,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    const { password, username, email, ...updateData } = updateUserDto;

    if (username && username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username },
      });
      if (existingUser) {
        throw new ConflictException({
          messageKey: 'ERROR.VALIDATION',
          message: 'Username already exists',
        });
      }
    }

    if (email && email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });
      if (existingUser) {
        throw new ConflictException({
          messageKey: 'ERROR.VALIDATION',
          message: 'Email already exists',
        });
      }
    }

    let passwordHash = user.passwordHash;
    if (password) {
      const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    await this.userRepository.update(id, {
      username,
      email,
      passwordHash,
      ...updateData,
    });

    const updatedUser = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        isActive: true,
        isLocked: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          id: true,
          roleName: true,
          description: true,
        },
      },
    });

    return {
      messageKey: 'USER.UPDATED',
      data: updatedUser,
    };
  }

  async remove(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    await this.userRepository.remove(user);

    return {
      messageKey: 'USER.DELETED',
      data: { id },
    };
  }

  async findByRole(roleName: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        role: { roleName },
      },
      relations: ['role'],
    });
  }

  async validateCurrentPassword(userId: string, currentPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'User not found',
      });
    }

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

    return {
      messageKey: 'USER.PASSWORD_VALIDATED',
      data: { valid: true },
    };
  }

  async updateCurrent(
    userId: string,
    updateCurrentUserDto: UpdateCurrentUserDto,
    profilePhoto?: Express.Multer.File
  ): Promise<any> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException({
          messageKey: 'ERROR.NOT_FOUND',
          message: 'User not found',
        });
      }

      const { currentPassword, newPassword, email, ...updateData } =
        updateCurrentUserDto;

      if (email && email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email },
        });
        if (existingUser) {
          throw new ConflictException({
            messageKey: 'ERROR.VALIDATION',
            message: 'Email already exists',
          });
        }
      }

      let passwordHash = user.passwordHash;
      if (currentPassword && newPassword) {
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

        const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
        passwordHash = await bcrypt.hash(newPassword, saltRounds);
      } else if (currentPassword || newPassword) {
        throw new BadRequestException({
          messageKey: 'ERROR.BOTH_PASSWORDS_REQUIRED',
          message:
            'Both current password and new password are required for password change',
        });
      }

      let profilePhotoPath = user.profilePhoto;
      if (profilePhoto) {
        try {
          const uploadResult = await this.filesService.uploadFile(
            profilePhoto,
            {
              entityType: 'user',
              entityId: userId,
              fileCategory: 'profile_photo',
            }
          );

          if (uploadResult.data && uploadResult.data.url) {
            profilePhotoPath = uploadResult.data.url;
          }
        } catch (fileError) {
          throw fileError;
        }
      }

      await this.userRepository.update(userId, {
        email,
        passwordHash,
        profilePhoto: profilePhotoPath,
        ...updateData,
      });

      const updatedUser = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role'],
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          address: true,
          documentNumber: true,
          dateOfBirth: true,
          homePhone: true,
          mobilePhone: true,
          isActive: true,
          isLocked: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          role: {
            id: true,
            roleName: true,
            description: true,
          },
        },
      });

      return {
        messageKey: 'USER.PROFILE_UPDATED',
        data: updatedUser,
      };
    } catch (error) {
      throw error;
    }
  }

  async searchUsers(query: string) {
    if (!query || query.trim().length < 2) {
      return {
        messageKey: 'USER.SEARCH_QUERY_TOO_SHORT',
        data: [],
      };
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.branch', 'branch')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.documentNumber',
        'user.mobilePhone',
        'user.profilePhoto',
        'user.branchId',
        'branch.id',
        'branch.name',
        'branch.code',
      ])
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere(
        '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.email ILIKE :query OR user.documentNumber ILIKE :query)',
        { query: `%${query.trim()}%` }
      )
      .orderBy('user.firstName', 'ASC')
      .limit(20)
      .getMany();

    return {
      messageKey: 'USER.SEARCH_RESULTS',
      data: users,
    };
  }
}
