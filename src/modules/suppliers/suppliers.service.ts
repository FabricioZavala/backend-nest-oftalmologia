import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { UpdateSupplierDto } from './dtos/update-supplier.dto';
import { QuerySupplierDto } from './dtos/query-supplier.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>
  ) {}

  async create(createSupplierDto: CreateSupplierDto, branchId: string) {
    if (createSupplierDto.documentNumber) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: {
          documentNumber: createSupplierDto.documentNumber,
          branchId,
        },
      });

      if (existingSupplier) {
        throw new ConflictException({
          statusCode: 409,
          success: false,
          message: {
            es: 'Ya existe un proveedor con este número de documento en esta sucursal',
            en: 'A supplier with this document number already exists in this branch',
          },
        });
      }
    }

    const supplier = this.supplierRepository.create({
      ...createSupplierDto,
      branchId,
    });

    const savedSupplier = await this.supplierRepository.save(supplier);

    return {
      statusCode: 201,
      success: true,
      message: {
        es: 'Proveedor creado exitosamente',
        en: 'Supplier created successfully',
      },
      data: savedSupplier,
    };
  }

  async findAll(queryDto: QuerySupplierDto, branchId: string) {
    if (!branchId) {
      throw new Error('BranchId is required but was not provided');
    }

    if (typeof branchId !== 'string' || branchId.trim() === '') {
      throw new Error(`Invalid branchId: ${branchId}`);
    }

    const { skip, take } = PaginationUtil.getSkipAndTake(queryDto);
    const queryBuilder = this.supplierRepository.createQueryBuilder('supplier');

    queryBuilder.where('supplier.branchId = :branchId', { branchId });

    if (queryDto.search) {
      queryBuilder.andWhere(
        'supplier.name ILIKE :search OR supplier.documentNumber ILIKE :search OR supplier.email ILIKE :search OR supplier.phone ILIKE :search',
        { search: `%${queryDto.search}%` }
      );
    }

    if (queryDto.name) {
      queryBuilder.andWhere('supplier.name ILIKE :name', {
        name: `%${queryDto.name}%`,
      });
    }

    if (queryDto.documentNumber) {
      queryBuilder.andWhere('supplier.documentNumber ILIKE :documentNumber', {
        documentNumber: `%${queryDto.documentNumber}%`,
      });
    }

    if (queryDto.email) {
      queryBuilder.andWhere('supplier.email ILIKE :email', {
        email: `%${queryDto.email}%`,
      });
    }

    if (queryDto.phone) {
      queryBuilder.andWhere('supplier.phone ILIKE :phone', {
        phone: `%${queryDto.phone}%`,
      });
    }

    if (queryDto.isActive !== undefined) {
      queryBuilder.andWhere('supplier.isActive = :isActive', {
        isActive: queryDto.isActive,
      });
    }

    queryBuilder.orderBy('supplier.createdAt', 'DESC').skip(skip).take(take);

    const [suppliers, totalCount] = await queryBuilder.getManyAndCount();

    const invalidSuppliers = suppliers.filter((s) => s.branchId !== branchId);
    if (invalidSuppliers.length > 0) {
      console.error(
        ' [SuppliersService] CRITICAL ERROR: Found suppliers from other branches!'
      );
      console.error('[SuppliersService] Expected branchId:', branchId);
      console.error(
        '[SuppliersService] Invalid suppliers:',
        invalidSuppliers.map((s) => ({
          id: s.id,
          name: s.name,
          branchId: s.branchId,
        }))
      );

      const validSuppliers = suppliers.filter((s) => s.branchId === branchId);

      const paginationResult = PaginationUtil.paginate(
        validSuppliers,
        validSuppliers.length,
        queryDto
      );

      return {
        statusCode: 200,
        success: true,
        message: {
          es: 'Proveedores obtenidos exitosamente',
          en: 'Suppliers retrieved successfully',
        },
        data: paginationResult,
      };
    }

    const paginationResult = PaginationUtil.paginate(
      suppliers,
      totalCount,
      queryDto
    );

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Proveedores obtenidos exitosamente',
        en: 'Suppliers retrieved successfully',
      },
      data: paginationResult,
    };
  }

  async findOne(id: string, branchId: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id, branchId },
    });

    if (!supplier) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Proveedor no encontrado',
          en: 'Supplier not found',
        },
      });
    }

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Proveedor obtenido exitosamente',
        en: 'Supplier retrieved successfully',
      },
      data: supplier,
    };
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    branchId: string
  ) {
    const supplier = await this.supplierRepository.findOne({
      where: { id, branchId },
    });

    if (!supplier) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Proveedor no encontrado',
          en: 'Supplier not found',
        },
      });
    }

    if (
      updateSupplierDto.documentNumber &&
      updateSupplierDto.documentNumber !== supplier.documentNumber
    ) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: {
          documentNumber: updateSupplierDto.documentNumber,
          branchId,
        },
      });

      if (existingSupplier) {
        throw new ConflictException({
          statusCode: 409,
          success: false,
          message: {
            es: 'Ya existe un proveedor con este número de documento en esta sucursal',
            en: 'A supplier with this document number already exists in this branch',
          },
        });
      }
    }

    Object.assign(supplier, updateSupplierDto);
    const updatedSupplier = await this.supplierRepository.save(supplier);

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Proveedor actualizado exitosamente',
        en: 'Supplier updated successfully',
      },
      data: updatedSupplier,
    };
  }

  async remove(id: string, branchId: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id, branchId },
    });

    if (!supplier) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Proveedor no encontrado',
          en: 'Supplier not found',
        },
      });
    }

    await this.supplierRepository.remove(supplier);

    return {
      statusCode: 200,
      success: true,
      message: {
        es: 'Proveedor eliminado exitosamente',
        en: 'Supplier deleted successfully',
      },
    };
  }
}
