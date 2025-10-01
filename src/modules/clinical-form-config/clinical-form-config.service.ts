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
      return null;
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

  async initializeConfig(branchId: string) {
    const configName = 'clinical_history_form';

    const existingConfig = await this.configRepository.findOne({
      where: {
        branchId,
        configName,
        isActive: true,
      },
    });

    if (existingConfig) {
      return {
        id: existingConfig.id,
        branchId: existingConfig.branchId,
        configName: existingConfig.configName,
        fieldsConfig: existingConfig.fieldsConfig,
        isActive: existingConfig.isActive,
        version: existingConfig.version,
        createdAt: existingConfig.createdAt,
        updatedAt: existingConfig.updatedAt,
      };
    }

    const defaultConfig = this.getDefaultConfig(configName);
    const createDto: CreateClinicalFormConfigDto = {
      configName,
      fieldsConfig: defaultConfig.fieldsConfig,
      isActive: true,
      version: 1,
    };

    return this.create(createDto, branchId);
  }

  async upsert(dto: CreateClinicalFormConfigDto, branchId: string) {
    const existingConfig = await this.configRepository.findOne({
      where: {
        branchId,
        configName: dto.configName,
        isActive: true,
      },
    });

    if (existingConfig) {
      Object.assign(existingConfig, dto);
      const savedConfig = await this.configRepository.save(existingConfig);

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
    } else {
      return this.create(dto, branchId);
    }
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
          step1_personalData: {
            visible: true,
            fields: {
              occupation: true,
              weight: true,
              height: true,
              allergies: true,
              currentMedications: true,
              chiefComplaint: true,
            },
          },
          step2_previousLensometry: {
            visible: true,
            fields: {
              previousRxOd: true,
              previousAddOd: true,
              previousRxOi: true,
              previousAddOi: true,
            },
          },
          step2_visualAcuityNoRx: {
            visible: true,
            fields: {
              visualAcuityOdVl: true,
              visualAcuityOdVp: true,
              visualAcuityOiVl: true,
              visualAcuityOiVp: true,
            },
          },
          step2_keratometry: {
            visible: true,
            fields: {
              keratometryOd: true,
              keratometryOi: true,
            },
          },
          step2_retinoscopy: {
            visible: true,
            fields: {
              retinoscopySphere: true,
              retinoscopyCylinder: true,
              retinoscopyAxis: true,
            },
          },
          step2_subjectiveRefraction: {
            visible: true,
            fields: {
              subjectiveRxOdSphere: true,
              subjectiveRxOdCylinder: true,
              subjectiveRxOdAxis: true,
              subjectiveRxOdAdd: true,
              subjectiveRxOiSphere: true,
              subjectiveRxOiCylinder: true,
              subjectiveRxOiAxis: true,
              subjectiveRxOiAdd: true,
            },
          },
          step2_visualAcuityWithRx: {
            visible: true,
            fields: {
              correctedAvOdVl: true,
              correctedAvOdVp: true,
              correctedAvOiVl: true,
              correctedAvOiVp: true,
            },
          },
          step2_motorTests: {
            visible: true,
            fields: {
              coverTest: true,
              ductions: true,
              versions: true,
              npc: true,
              npa: true,
              fusionalVergences: true,
              stereopsis: true,
            },
          },
          step3_pupillaryReflexes: {
            visible: true,
            fields: {
              directReflexOd: true,
              directReflexOi: true,
              consensualReflexOd: true,
              consensualReflexOi: true,
            },
          },
          step3_ophthalmoscopy: {
            visible: true,
            fields: {
              ophthalmoscopyOd: true,
              ophthalmoscopyOi: true,
            },
          },
          step3_refractiveTests: {
            visible: true,
            fields: {
              retinoscopy: true,
              autorefraction: true,
              keratometry: true,
            },
          },
          step3_otherExams: {
            visible: true,
            fields: {
              biomicroscopy: true,
              tonometry: true,
              gonioscopy: true,
              pachymetry: true,
            },
          },
          step3_diagnosisAndDisposition: {
            visible: true,
            fields: {
              diagnosis: true,
              treatment: true,
              recommendations: true,
              followUp: true,
              referral: true,
            },
          },
        },
      },
      version: 1,
      isDefault: true,
    };
  }
}
