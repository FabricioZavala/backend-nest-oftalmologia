import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { QueryUserDto } from './dtos/query-user.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { username, email, password, adress, document_number, home_phone, mobile_phone, ...userData } = createUserDto;

    // Check if username or email already exists
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

    // Hash password
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Map snake_case to camelCase and prepare user data
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

    // Create user
    const user = this.userRepository.create(userDataMapped);

    const savedUser = await this.userRepository.save(user);

    // Return user without password
    const { passwordHash: _, ...userWithoutPassword } = savedUser;

    return {
      messageKey: 'USER.CREATED',
      data: userWithoutPassword,
    };
  }

  async findAll(queryDto: QueryUserDto) {
    const { page, limit, search, roleId, isActive, isLocked } = queryDto;
    const { skip, take } = PaginationUtil.getSkipAndTake({ page, limit });

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
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
      ]);

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (roleId) {
      queryBuilder.andWhere('user.roleId = :roleId', { roleId });
    }

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (typeof isLocked === 'boolean') {
      queryBuilder.andWhere('user.isLocked = :isLocked', { isLocked });
    }

    // Get total count
    const totalCount = await queryBuilder.getCount();

    // Apply pagination and get results
    const users = await queryBuilder.skip(skip).take(take).getMany();

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
        failedLoginAttempts: true,
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

    // Check for username/email conflicts if they're being updated
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

    // Hash new password if provided
    let passwordHash = user.passwordHash;
    if (password) {
      const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    // Update user
    await this.userRepository.update(id, {
      username,
      email,
      passwordHash,
      ...updateData,
    });

    // Get updated user
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
}
