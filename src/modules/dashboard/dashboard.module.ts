import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Shift } from '../shift-management/entities/shift.entity';
import { ClinicalHistory } from '../clinical-histories/entities/clinical-history.entity';
import { LaboratoryOrder } from '../laboratory-orders/entities/laboratory-order.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shift,
      ClinicalHistory,
      LaboratoryOrder,
      Product,
      User,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
