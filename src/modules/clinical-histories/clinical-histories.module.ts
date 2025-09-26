import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalHistoriesService } from './clinical-histories.service';
import { ClinicalHistoriesController } from './clinical-histories.controller';
import { ClinicalHistory } from './entities/clinical-history.entity';
import { ClinicalFormConfigModule } from '../clinical-form-config/clinical-form-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicalHistory]),
    forwardRef(() => ClinicalFormConfigModule),
  ],
  controllers: [ClinicalHistoriesController],
  providers: [ClinicalHistoriesService],
  exports: [ClinicalHistoriesService],
})
export class ClinicalHistoriesModule {}
