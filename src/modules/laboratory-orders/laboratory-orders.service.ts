import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LaboratoryOrder } from './entities/laboratory-order.entity';
import { ClinicalHistory } from '../clinical-histories/entities/clinical-history.entity';
import { CreateLaboratoryOrderDto } from './dtos/create-laboratory-order.dto';
import { UpdateLaboratoryOrderDto } from './dtos/update-laboratory-order.dto';
import { QueryLaboratoryOrderDto } from './dtos/query-laboratory-order.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';

@Injectable()
export class LaboratoryOrdersService {
  constructor(
    @InjectRepository(LaboratoryOrder)
    private laboratoryOrderRepository: Repository<LaboratoryOrder>,
    @InjectRepository(ClinicalHistory)
    private clinicalHistoryRepository: Repository<ClinicalHistory>
  ) {}

  async create(createDto: CreateLaboratoryOrderDto, branchId: string) {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const orderNumber = await this.generateOrderNumber();

        const laboratoryOrder = this.laboratoryOrderRepository.create({
          ...createDto,
          branchId,
          orderNumber,
        });

        const savedOrder = await this.laboratoryOrderRepository.save(
          laboratoryOrder
        );

        if (createDto.clinicalHistoryId) {
          await this.clinicalHistoryRepository.update(
            { id: createDto.clinicalHistoryId, branchId },
            { isSent: true }
          );
        }

        const orderWithRelations = await this.laboratoryOrderRepository.findOne({
          where: { id: savedOrder.id },
          relations: ['user', 'product'],
        });

        const response = this.formatResponse(orderWithRelations);
        return response;
      } catch (error) {
        lastError = error;
        if (error.code === '23505' && attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }

  async findAll(queryDto: QueryLaboratoryOrderDto, branchId: string) {
    const {
      page,
      limit,
      userId,
      isConfirmed,
      cedula,
      firstName,
      lastName,
      email,
      mobilePhone,
      status,
      deliveryDate,
      sortBy,
      sortOrder,
    } = queryDto;

    const queryBuilder = this.laboratoryOrderRepository
      .createQueryBuilder('lo')
      .leftJoinAndSelect('lo.user', 'user')
      .leftJoinAndSelect('lo.product', 'product')
      .where('lo.branchId = :branchId', { branchId });

    if (userId) {
      queryBuilder.andWhere('lo.userId = :userId', { userId });
    }

    if (typeof isConfirmed === 'boolean') {
      queryBuilder.andWhere('lo.isConfirmed = :isConfirmed', { isConfirmed });
    }

    if (cedula) {
      queryBuilder.andWhere('user.documentNumber ILIKE :cedula', {
        cedula: `%${cedula}%`,
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

    if (email) {
      queryBuilder.andWhere('user.email ILIKE :email', {
        email: `%${email}%`,
      });
    }

    if (mobilePhone) {
      queryBuilder.andWhere('user.mobilePhone ILIKE :mobilePhone', {
        mobilePhone: `%${mobilePhone}%`,
      });
    }

    if (status) {
      const isConfirmedValue =
        status === 'sent' ? true : status === 'pending' ? false : null;
      if (isConfirmedValue !== null) {
        queryBuilder.andWhere('lo.isConfirmed = :statusFilter', {
          statusFilter: isConfirmedValue,
        });
      }
    }

    if (deliveryDate) {
      queryBuilder.andWhere('lo.deliveryDate = :deliveryDate', {
        deliveryDate,
      });
    }

    queryBuilder.orderBy(`lo.${sortBy}`, sortOrder);

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
    const laboratoryOrder = await this.laboratoryOrderRepository.findOne({
      where: { id, branchId },
      relations: ['user', 'product'],
    });

    if (!laboratoryOrder) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Laboratory order not found',
      });
    }

    return this.formatResponse(laboratoryOrder);
  }

  async update(
    id: string,
    updateDto: UpdateLaboratoryOrderDto,
    branchId: string
  ) {
    const laboratoryOrder = await this.findOne(id, branchId);

    if (!laboratoryOrder) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Laboratory order not found',
      });
    }

    await this.laboratoryOrderRepository.update({ id, branchId }, updateDto);

    const updatedOrder = await this.findOne(id, branchId);
    return this.formatResponse(updatedOrder);
  }

  async changeStatus(id: string, isConfirmed: boolean, branchId: string) {
    const laboratoryOrder = await this.findOne(id, branchId);

    if (!laboratoryOrder) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Laboratory order not found',
      });
    }

    await this.laboratoryOrderRepository.update(
      { id, branchId },
      { isConfirmed }
    );

    const updatedOrder = await this.findOne(id, branchId);
    return this.formatResponse(updatedOrder);
  }

  async remove(id: string, branchId: string) {
    const laboratoryOrder = await this.findOne(id, branchId);

    if (!laboratoryOrder) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Laboratory order not found',
      });
    }

    await this.laboratoryOrderRepository.delete({ id, branchId });

    return {
      messageKey: 'SUCCESS.DELETED',
      message: 'Laboratory order deleted successfully',
    };
  }

  async getDataFromClinicalHistory(
    clinicalHistoryId: string,
    branchId: string
  ) {
    const clinicalHistory = await this.clinicalHistoryRepository.findOne({
      where: { id: clinicalHistoryId, branchId },
      relations: ['user'],
    });

    if (!clinicalHistory) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Clinical history not found',
      });
    }

    return {
      clinicalHistoryId: clinicalHistory.id,
      userId: clinicalHistory.userId,
      firstName: clinicalHistory.user.firstName,
      lastName: clinicalHistory.user.lastName,
      documentNumber: clinicalHistory.user.documentNumber,
      email: clinicalHistory.user.email,
      mobilePhone: clinicalHistory.user.mobilePhone,
      homePhone: clinicalHistory.user.homePhone,
      odSphere: clinicalHistory.finalRxOdSphere,
      odCylinder: clinicalHistory.finalRxOdCylinder,
      odAxis: clinicalHistory.finalRxOdAxis,
      odAdd: clinicalHistory.finalRxOdAdd,
      oiSphere: clinicalHistory.finalRxOiSphere,
      oiCylinder: clinicalHistory.finalRxOiCylinder,
      oiAxis: clinicalHistory.finalRxOiAxis,
      oiAdd: clinicalHistory.finalRxOiAdd,
    };
  }

  private formatResponse(laboratoryOrder: any) {
    return {
      id: laboratoryOrder.id,
      orderNumber: laboratoryOrder.orderNumber,
      branchId: laboratoryOrder.branchId,
      userId: laboratoryOrder.userId,
      clinicalHistoryId: laboratoryOrder.clinicalHistoryId,
      attendanceDate: laboratoryOrder.attendanceDate,
      deliveryDate: laboratoryOrder.deliveryDate,
      odSphere: laboratoryOrder.odSphere,
      odCylinder: laboratoryOrder.odCylinder,
      odAxis: laboratoryOrder.odAxis,
      odAdd: laboratoryOrder.odAdd,
      odHeight: laboratoryOrder.odHeight,
      odDnp: laboratoryOrder.odDnp,
      oiSphere: laboratoryOrder.oiSphere,
      oiCylinder: laboratoryOrder.oiCylinder,
      oiAxis: laboratoryOrder.oiAxis,
      oiAdd: laboratoryOrder.oiAdd,
      oiHeight: laboratoryOrder.oiHeight,
      oiDnp: laboratoryOrder.oiDnp,
      cbase: laboratoryOrder.cbase,
      sunDegree: laboratoryOrder.sunDegree,
      prism: laboratoryOrder.prism,
      base: laboratoryOrder.base,
      dVertex: laboratoryOrder.dVertex,
      pantos: laboratoryOrder.pantos,
      panora: laboratoryOrder.panora,
      frameFit: laboratoryOrder.frameFit,
      profile: laboratoryOrder.profile,
      mid: laboratoryOrder.mid,
      distVp: laboratoryOrder.distVp,
      engraving: laboratoryOrder.engraving,
      productId: laboratoryOrder.productId,
      frameType: laboratoryOrder.frameType,
      frameTypeDescription: laboratoryOrder.frameTypeDescription,
      frameBrand: laboratoryOrder.frameBrand,
      frameModel: laboratoryOrder.frameModel,
      frameData: laboratoryOrder.frameData,
      frameLargerDiameter: laboratoryOrder.frameLargerDiameter,
      frameHorizontal: laboratoryOrder.frameHorizontal,
      frameVertical: laboratoryOrder.frameVertical,
      frameBridge: laboratoryOrder.frameBridge,
      observations: laboratoryOrder.observations,
      isConfirmed: laboratoryOrder.isConfirmed,
      createdAt: laboratoryOrder.createdAt,
      updatedAt: laboratoryOrder.updatedAt,
      user: laboratoryOrder.user
        ? {
            id: laboratoryOrder.user.id,
            firstName: laboratoryOrder.user.firstName,
            lastName: laboratoryOrder.user.lastName,
            documentNumber: laboratoryOrder.user.documentNumber,
            email: laboratoryOrder.user.email,
            mobilePhone: laboratoryOrder.user.mobilePhone,
            homePhone: laboratoryOrder.user.homePhone,
          }
        : null,
      product: laboratoryOrder.product
        ? {
            id: laboratoryOrder.product.id,
            code: laboratoryOrder.product.code,
            name: laboratoryOrder.product.name,
            brand: laboratoryOrder.product.brand,
          }
        : null,
    };
  }


  private async generateOrderNumber(): Promise<number> {
    const result = await this.laboratoryOrderRepository
      .createQueryBuilder('order')
      .select('MAX(order.orderNumber)', 'maxOrderNumber')
      .getRawOne();

    const maxOrderNumber = result?.maxOrderNumber || 0;
    return maxOrderNumber + 1;
  }
}
