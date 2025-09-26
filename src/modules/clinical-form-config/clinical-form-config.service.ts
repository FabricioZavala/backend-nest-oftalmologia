import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalFormConfig } from './entities/clinical-form-config.entity';
import { CreateClinicalFormConfigDto } from './dtos/create-clinical-form-config.dto';
import { UpdateClinicalFormConfigDto } from './dtos/update-clinical-form-config.dto';

@Injectable()
export class ClinicalFormConfigService {
  constructor(
    @InjectRepository(ClinicalFormConfig)
    private configRepository: Repository<ClinicalFormConfig>
  ) {}

  async getFormConfig(branchId: string, configName = 'clinical_history_form') {
    const config = await this.configRepository.findOne({
      where: {
        branchId,
        configName,
        isActive: true,
      },
    });

    if (!config) {
      return this.getDefaultConfig(configName);
    }

    return {
      id: config.id,
      branchId: config.branchId,
      configName: config.configName,
      fieldsConfig: config.fieldsConfig,
      version: config.version,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  async create(createDto: CreateClinicalFormConfigDto, branchId: string) {
    const existingConfig = await this.configRepository.findOne({
      where: {
        branchId,
        configName: createDto.configName,
        isActive: true,
      },
    });

    if (existingConfig) {
      throw new BadRequestException({
        messageKey: 'ERROR.VALIDATION',
        message: 'Configuration already exists for this branch and name',
      });
    }

    const config = this.configRepository.create({
      ...createDto,
      branchId,
    });

    const savedConfig = await this.configRepository.save(config);

    return {
      id: savedConfig.id,
      branchId: savedConfig.branchId,
      configName: savedConfig.configName,
      fieldsConfig: savedConfig.fieldsConfig,
      isActive: savedConfig.isActive,
      version: savedConfig.version,
      createdAt: savedConfig.createdAt,
      updatedAt: savedConfig.updatedAt,
    };
  }

  async update(
    id: string,
    updateDto: UpdateClinicalFormConfigDto,
    branchId: string
  ) {
    const config = await this.configRepository.findOne({
      where: { id, branchId },
    });

    if (!config) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Configuration not found',
      });
    }

    Object.assign(config, updateDto);
    const savedConfig = await this.configRepository.save(config);

    return {
      id: savedConfig.id,
      branchId: savedConfig.branchId,
      configName: savedConfig.configName,
      fieldsConfig: savedConfig.fieldsConfig,
      isActive: savedConfig.isActive,
      version: savedConfig.version,
      createdAt: savedConfig.createdAt,
      updatedAt: savedConfig.updatedAt,
    };
  }

  async findOne(id: string, branchId: string) {
    const config = await this.configRepository.findOne({
      where: { id, branchId },
    });

    if (!config) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'Configuration not found',
      });
    }

    return {
      id: config.id,
      branchId: config.branchId,
      configName: config.configName,
      fieldsConfig: config.fieldsConfig,
      isActive: config.isActive,
      version: config.version,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  private getDefaultConfig(configName: string) {
    return {
      configName,
      fieldsConfig: {
        sections: {
          previousLensometry: {
            visible: true,
            fields: {
              previousRxOd: true,
              previousAddOd: true,
              previousRxOi: true,
              previousAddOi: true,
            },
          },
          visualAcuityNoRx: {
            visible: true,
            fields: {
              visualAcuityOdVl: true,
              visualAcuityOdVp: true,
              visualAcuityOiVl: true,
              visualAcuityOiVp: true,
            },
          },
          motorTest: {
            visible: true,
            fields: {
              motorTest: true,
            },
          },
          finalRx: {
            visible: true,
            fields: {
              finalRxOdSphere: true,
              finalRxOdCylinder: true,
              finalRxOdAxis: true,
              finalRxOdAdd: true,
              finalRxOiSphere: true,
              finalRxOiCylinder: true,
              finalRxOiAxis: true,
              finalRxOiAdd: true,
            },
          },
          correctedAv: {
            visible: true,
            fields: {
              correctedAvOdVl: true,
              correctedAvOdVp: true,
              correctedAvOiVl: true,
              correctedAvOiVp: true,
            },
          },
          lensTypes: {
            visible: true,
            fields: {
              lensTypes: true,
            },
          },
          pupillaryReflexes: {
            visible: true,
            fields: {
              pupillaryReflexes: true,
            },
          },
          ophthalmoscopy: {
            visible: true,
            fields: {
              ophthalmoscopyOd: true,
              ophthalmoscopyOi: true,
            },
          },
          refractiveTests: {
            visible: true,
            fields: {
              refractiveTests: true,
            },
          },
          additionalInfo: {
            visible: true,
            fields: {
              stereopsis: true,
              worthTest: true,
              otherNotes: true,
              diagnosis: true,
              disposition: true,
            },
          },
        },
      },
      version: 1,
      isDefault: true,
    };
  }
}
