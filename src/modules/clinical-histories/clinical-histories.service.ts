import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ClinicalHistory } from './entities/clinical-history.entity';
import { CreateClinicalHistoryDto } from './dtos/create-clinical-history.dto';
import { UpdateClinicalHistoryDto } from './dtos/update-clinical-history.dto';
import { QueryClinicalHistoryDto } from './dtos/query-clinical-history.dto';
import { ClinicalFormConfigService } from '../clinical-form-config/clinical-form-config.service';
import { PaginationUtil } from '../../common/utils/pagination.util';

@Injectable()
export class ClinicalHistoriesService {
  constructor(
    @InjectRepository(ClinicalHistory)
    private clinicalHistoryRepository: Repository<ClinicalHistory>,
    @Inject(forwardRef(() => ClinicalFormConfigService))
    private configService: ClinicalFormConfigService
  ) {}

  async create(createDto: CreateClinicalHistoryDto, branchId: string) {
    await this.validateFieldsAgainstConfig(createDto, branchId);

    const clinicalHistory = this.clinicalHistoryRepository.create({
      ...createDto,
      branchId,
    });

    const savedHistory = await this.clinicalHistoryRepository.save(
      clinicalHistory
    );

    return this.formatResponse(savedHistory);
  }

  async findAll(queryDto: QueryClinicalHistoryDto, branchId: string) {
    const {
      page,
      limit,
      userId,
      isSent,
      search,
      identification,
      firstName,
      lastName,
      phone,
      email,
      status,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = queryDto;


    const queryBuilder = this.clinicalHistoryRepository
      .createQueryBuilder('ch')
      .leftJoinAndSelect('ch.user', 'user')
      .where('ch.branchId = :branchId', { branchId });

    if (userId) {
      queryBuilder.andWhere('ch.userId = :userId', { userId });
    }

    if (typeof isSent === 'boolean') {
      queryBuilder.andWhere('ch.isSent = :isSent', { isSent });
    }

    if (identification) {
      queryBuilder.andWhere('user.documentNumber ILIKE :identification', {
        identification: `%${identification}%`,
      });
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

    if (phone) {
      queryBuilder.andWhere(
        '(user.mobilePhone ILIKE :phone OR user.homePhone ILIKE :phone)',
        { phone: `%${phone}%` }
      );
    }

    if (email) {
      queryBuilder.andWhere('user.email ILIKE :email', {
        email: `%${email}%`,
      });
    }

    if (status) {
      const isSentValue =
        status === 'enviado' ? true : status === 'pendiente' ? false : null;
      if (isSentValue !== null) {
        queryBuilder.andWhere('ch.isSent = :statusFilter', {
          statusFilter: isSentValue,
        });
      }
    }

    if (dateFrom) {
      queryBuilder.andWhere('ch.lastVisualExamDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('ch.lastVisualExamDate <= :dateTo', { dateTo });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.documentNumber ILIKE :search OR ch.professionalName ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    queryBuilder.orderBy(`ch.${sortBy}`, sortOrder);

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return PaginationUtil.paginate(
      data.map((item) => this.formatResponse(item)),
      total,
      { page, limit }
    );
  }

  async findOne(id: string, branchId: string) {
    const clinicalHistory = await this.clinicalHistoryRepository.findOne({
      where: { id, branchId },
      relations: ['user'],
    });

    if (!clinicalHistory) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Clinical history not found',
      });
    }

    return this.formatResponse(clinicalHistory);
  }

  async findByUser(userId: string, branchId: string) {
    const clinicalHistories = await this.clinicalHistoryRepository.find({
      where: { userId, branchId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return clinicalHistories.map((item) => this.formatResponse(item));
  }

  async update(
    id: string,
    updateDto: UpdateClinicalHistoryDto,
    branchId: string
  ) {
    const clinicalHistory = await this.clinicalHistoryRepository.findOne({
      where: { id, branchId },
    });

    if (!clinicalHistory) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Clinical history not found',
      });
    }

    await this.validateFieldsAgainstConfig(updateDto, branchId);

    Object.assign(clinicalHistory, updateDto);
    const savedHistory = await this.clinicalHistoryRepository.save(
      clinicalHistory
    );

    return this.formatResponse(savedHistory);
  }

  async changeStatus(id: string, isSent: boolean, branchId: string) {
    const clinicalHistory = await this.clinicalHistoryRepository.findOne({
      where: { id, branchId },
    });

    if (!clinicalHistory) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Clinical history not found',
      });
    }

    clinicalHistory.isSent = isSent;
    const savedHistory = await this.clinicalHistoryRepository.save(
      clinicalHistory
    );

    return this.formatResponse(savedHistory);
  }

  async remove(id: string, branchId: string) {
    const clinicalHistory = await this.clinicalHistoryRepository.findOne({
      where: { id, branchId },
    });

    if (!clinicalHistory) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Clinical history not found',
      });
    }

    await this.clinicalHistoryRepository.remove(clinicalHistory);

    return {
      messageKey: 'SUCCESS.DELETE',
      message: 'Clinical history deleted successfully',
    };
  }

  private async validateFieldsAgainstConfig(
    dto: CreateClinicalHistoryDto | UpdateClinicalHistoryDto,
    branchId: string
  ) {
    try {
      const config = await this.configService.getFormConfig(branchId);
      const fieldsConfig = config.fieldsConfig;

      const disabledFields: string[] = [];

      Object.keys(fieldsConfig.sections).forEach((sectionKey) => {
        const section = fieldsConfig.sections[sectionKey];
        if (!section.visible) {
          Object.keys(section.fields).forEach((fieldKey) => {
            disabledFields.push(fieldKey);
          });
        } else {
          Object.keys(section.fields).forEach((fieldKey) => {
            if (!section.fields[fieldKey]) {
              disabledFields.push(fieldKey);
            }
          });
        }
      });

      const sentFields = Object.keys(dto).filter(
        (key) => dto[key] !== undefined
      );
      const invalidFields = sentFields.filter((field) =>
        disabledFields.includes(field)
      );

      if (invalidFields.length > 0) {
        throw new BadRequestException({
          messageKey: 'ERROR.VALIDATION',
          message: `The following fields are disabled for this branch: ${invalidFields.join(
            ', '
          )}`,
          disabledFields: invalidFields,
        });
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.warn('Failed to validate fields against config:', error.message);
    }
  }

  private formatResponse(clinicalHistory: ClinicalHistory) {
    return {
      id: clinicalHistory.id,
      branchId: clinicalHistory.branchId,
      userId: clinicalHistory.userId,
      user: clinicalHistory.user
        ? {
            id: clinicalHistory.user.id,
            firstName: clinicalHistory.user.firstName,
            lastName: clinicalHistory.user.lastName,
            documentNumber: clinicalHistory.user.documentNumber,
            email: clinicalHistory.user.email,
            mobilePhone: clinicalHistory.user.mobilePhone,
          }
        : null,
      professionalName: clinicalHistory.professionalName,
      occupation: clinicalHistory.occupation,
      firstTime: clinicalHistory.firstTime,
      isSent: clinicalHistory.isSent,
      lastVisualExamDate: clinicalHistory.lastVisualExamDate,
      visionProblems: clinicalHistory.visionProblems,
      generalHealth: clinicalHistory.generalHealth,
      otherHealthProblems: clinicalHistory.otherHealthProblems,
      segmentAnterior: clinicalHistory.segmentAnterior,
      segmentAnteriorOther: clinicalHistory.segmentAnteriorOther,
      previousRxOd: clinicalHistory.previousRxOd,
      previousAddOd: clinicalHistory.previousAddOd,
      previousRxOi: clinicalHistory.previousRxOi,
      previousAddOi: clinicalHistory.previousAddOi,
      visualAcuityOdVl: clinicalHistory.visualAcuityOdVl,
      visualAcuityOdVp: clinicalHistory.visualAcuityOdVp,
      visualAcuityOiVl: clinicalHistory.visualAcuityOiVl,
      visualAcuityOiVp: clinicalHistory.visualAcuityOiVp,
      motorTest: clinicalHistory.motorTest,
      finalRxOdSphere: clinicalHistory.finalRxOdSphere,
      finalRxOdCylinder: clinicalHistory.finalRxOdCylinder,
      finalRxOdAxis: clinicalHistory.finalRxOdAxis,
      finalRxOdAdd: clinicalHistory.finalRxOdAdd,
      finalRxOiSphere: clinicalHistory.finalRxOiSphere,
      finalRxOiCylinder: clinicalHistory.finalRxOiCylinder,
      finalRxOiAxis: clinicalHistory.finalRxOiAxis,
      finalRxOiAdd: clinicalHistory.finalRxOiAdd,
      correctedAvOdVl: clinicalHistory.correctedAvOdVl,
      correctedAvOdVp: clinicalHistory.correctedAvOdVp,
      correctedAvOiVl: clinicalHistory.correctedAvOiVl,
      correctedAvOiVp: clinicalHistory.correctedAvOiVp,
      lensTypes: clinicalHistory.lensTypes,
      pupillaryReflexes: clinicalHistory.pupillaryReflexes,
      ophthalmoscopyOd: clinicalHistory.ophthalmoscopyOd,
      ophthalmoscopyOi: clinicalHistory.ophthalmoscopyOi,
      refractiveTests: clinicalHistory.refractiveTests,
      stereopsis: clinicalHistory.stereopsis,
      worthTest: clinicalHistory.worthTest,
      otherNotes: clinicalHistory.otherNotes,
      diagnosis: clinicalHistory.diagnosis,
      disposition: clinicalHistory.disposition,
      createdAt: clinicalHistory.createdAt,
      updatedAt: clinicalHistory.updatedAt,
    };
  }
}
