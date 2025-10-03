import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Shift } from '../entities/shift.entity';
import { ShiftStatus } from '../entities/shift-status.entity';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { CreateShiftDto } from '../dtos/create-shift.dto';
import { UpdateShiftDto } from '../dtos/update-shift.dto';
import { QueryShiftDto } from '../dtos/query-shift.dto';
import { PaginationUtil } from '../../../common/utils/pagination.util';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(ShiftStatus)
    private shiftStatusRepository: Repository<ShiftStatus>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>
  ) {}

  async create(createShiftDto: CreateShiftDto, branchId: string) {
    const { userId, appointmentDate } = createShiftDto;

    await this.validateUser(userId);
    await this.validateBranch(branchId);

    const appointmentDateTime = new Date(appointmentDate);
    await this.validateAppointmentDate(appointmentDateTime);
    await this.checkDuplicateAppointment(userId, appointmentDateTime);

    const pendingStatus = await this.getDefaultStatus();

    const shift = this.shiftRepository.create({
      ...createShiftDto,
      branchId,
      appointmentDate: appointmentDateTime,
      statusId: pendingStatus.id,
    });

    const savedShift = await this.shiftRepository.save(shift);

    return {
      messageKey: 'SHIFT.CREATED',
      data: savedShift,
    };
  }

  async findAll(queryDto: QueryShiftDto, branchId: string) {
    const {
      page,
      limit,
      patientName,
      patientId,
      phone,
      email,
      userId,
      statusId,
      dateFrom,
      dateTo,
    } = queryDto;

    const { skip, take } = PaginationUtil.getSkipAndTake({ page, limit });

    const queryBuilder = this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.user', 'user')
      .leftJoinAndSelect('shift.status', 'status')
      .leftJoinAndSelect('shift.branch', 'branch')
      .select([
        'shift.id',
        'shift.appointmentDate',
        'shift.description',
        'shift.notes',
        'shift.createdAt',
        'shift.updatedAt',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.documentNumber',
        'user.mobilePhone',
        'user.profilePhoto',
        'status.id',
        'status.name',
        'status.description',
        'status.color',
        'branch.id',
        'branch.name',
      ])
      .where('shift.branchId = :branchId', { branchId });

    if (patientName) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :patientName OR user.lastName ILIKE :patientName)',
        { patientName: `%${patientName}%` }
      );
    }

    if (patientId) {
      queryBuilder.andWhere('user.documentNumber ILIKE :patientId', {
        patientId: `%${patientId}%`,
      });
    }

    if (phone) {
      queryBuilder.andWhere('user.mobilePhone ILIKE :phone', {
        phone: `%${phone}%`,
      });
    }

    if (email) {
      queryBuilder.andWhere('user.email ILIKE :email', {
        email: `%${email}%`,
      });
    }

    if (userId) {
      queryBuilder.andWhere('shift.userId = :userId', { userId });
    }

    if (statusId) {
      queryBuilder.andWhere('shift.statusId = :statusId', { statusId });
    }

    if (dateFrom && dateTo) {
      queryBuilder.andWhere(
        'shift.appointmentDate BETWEEN :dateFrom AND :dateTo',
        { dateFrom, dateTo }
      );
    } else if (dateFrom) {
      queryBuilder.andWhere('shift.appointmentDate >= :dateFrom', { dateFrom });
    } else if (dateTo) {
      queryBuilder.andWhere('shift.appointmentDate <= :dateTo', { dateTo });
    }

    queryBuilder.orderBy('shift.createdAt', 'DESC').skip(skip).take(take);

    const [shifts, total] = await queryBuilder.getManyAndCount();

    const paginatedResult = PaginationUtil.paginate(shifts, total, {
      page,
      limit,
    });

    return {
      messageKey: 'SHIFT.FOUND',
      data: paginatedResult,
    };
  }

  async findOne(id: string, branchId: string) {
    const shift = await this.shiftRepository.findOne({
      where: { id, branchId },
      relations: ['user', 'status', 'branch'],
      select: {
        id: true,
        appointmentDate: true,
        description: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          documentNumber: true,
          mobilePhone: true,
          profilePhoto: true,
        },
        status: {
          id: true,
          name: true,
          description: true,
          color: true,
        },
        branch: {
          id: true,
          name: true,
        },
      },
    });

    if (!shift) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    return {
      messageKey: 'SHIFT.FETCHED',
      data: shift,
    };
  }

  async update(id: string, updateShiftDto: UpdateShiftDto, branchId: string) {
    const shift = await this.shiftRepository.findOne({
      where: { id, branchId },
    });

    if (!shift) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    if (updateShiftDto.appointmentDate) {
      const appointmentDateTime = new Date(updateShiftDto.appointmentDate);
      await this.validateAppointmentDate(appointmentDateTime);

      if (appointmentDateTime.getTime() !== shift.appointmentDate.getTime()) {
        await this.checkDuplicateAppointment(
          shift.userId,
          appointmentDateTime,
          id
        );
      }

      updateShiftDto.appointmentDate = appointmentDateTime.toISOString();
    }

    if (updateShiftDto.statusId) {
      await this.validateStatus(updateShiftDto.statusId);
    }

    Object.assign(shift, updateShiftDto);
    const updatedShift = await this.shiftRepository.save(shift);

    return {
      messageKey: 'SHIFT.UPDATED',
      data: updatedShift,
    };
  }

  async remove(id: string, branchId: string) {
    const shift = await this.shiftRepository.findOne({
      where: { id, branchId },
    });

    if (!shift) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
      });
    }

    await this.shiftRepository.remove(shift);

    return {
      messageKey: 'SHIFT.DELETED',
      data: { id },
    };
  }

  private async validateUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'User not found or inactive',
      });
    }

    return user;
  }

  private async validateBranch(branchId: string) {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId, isActive: true },
    });

    if (!branch) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Branch not found or inactive',
      });
    }

    return branch;
  }

  private async validateStatus(statusId: string) {
    const status = await this.shiftStatusRepository.findOne({
      where: { id: statusId, isActive: true },
    });

    if (!status) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Status not found or inactive',
      });
    }

    return status;
  }

  private async validateAppointmentDate(appointmentDate: Date) {
    const now = new Date();

    if (appointmentDate <= now) {
      throw new BadRequestException({
        messageKey: 'ERROR.VALIDATION',
        message: 'Appointment date must be in the future',
      });
    }
  }

  private async checkDuplicateAppointment(
    userId: string,
    appointmentDate: Date,
    excludeShiftId?: string
  ) {
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const queryBuilder = this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.userId = :userId', { userId })
      .andWhere('shift.appointmentDate BETWEEN :startOfDay AND :endOfDay', {
        startOfDay,
        endOfDay,
      });

    if (excludeShiftId) {
      queryBuilder.andWhere('shift.id != :excludeShiftId', { excludeShiftId });
    }

    const existingShift = await queryBuilder.getOne();

    if (existingShift) {
      throw new ConflictException({
        messageKey: 'ERROR.VALIDATION',
        message: 'User already has an appointment on this date',
      });
    }
  }

  private async getDefaultStatus() {
    // ID del estado predeterminado (Pendiente, recordar cambiar si no se migra la data de esta db thiss)
    const DEFAULT_STATUS_ID = '4d0671f6-97cf-40fd-8811-005f5fd4d03e';

    let defaultStatus = await this.shiftStatusRepository.findOne({
      where: { id: DEFAULT_STATUS_ID, isActive: true },
    });

    if (!defaultStatus) {
      defaultStatus = await this.shiftStatusRepository.findOne({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
    }

    if (!defaultStatus) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message:
          'No active status found. Please create at least one shift status.',
      });
    }

    return defaultStatus;
  }
}
