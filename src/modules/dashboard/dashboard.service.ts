import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Shift } from '../shift-management/entities/shift.entity';
import { ClinicalHistory } from '../clinical-histories/entities/clinical-history.entity';
import { LaboratoryOrder } from '../laboratory-orders/entities/laboratory-order.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import {
  AppointmentsTrendResponse,
  DiagnosisFrequencyResponse,
  LaboratoryOrdersStatusResponse,
  ProductsInventoryResponse,
  ShiftStatusDistributionResponse,
  PatientsAgeDemographicsResponse,
} from './dto/dashboard-responses.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(ClinicalHistory)
    private readonly clinicalHistoryRepository: Repository<ClinicalHistory>,
    @InjectRepository(LaboratoryOrder)
    private readonly laboratoryOrderRepository: Repository<LaboratoryOrder>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async getAppointmentsTrend(
    branchId: string,
    months: number = 6
  ): Promise<AppointmentsTrendResponse> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const shifts = await this.shiftRepository.find({
      where: {
        branchId,
        appointmentDate: Between(startDate, endDate),
      },
      order: { appointmentDate: 'ASC' },
    });

    // Agrupar por mes
    const monthlyData = new Map<string, number>();
    shifts.forEach((shift) => {
      const monthKey = new Date(shift.appointmentDate)
        .toISOString()
        .slice(0, 7);
      monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
    });

    const labels: string[] = [];
    const data: number[] = [];
    monthlyData.forEach((count, month) => {
      labels.push(month);
      data.push(count);
    });

    return {
      labels,
      data,
      total: shifts.length,
    };
  }

  async getDiagnosisFrequency(
    branchId: string
  ): Promise<DiagnosisFrequencyResponse> {
    const clinicalHistories = await this.clinicalHistoryRepository.find({
      where: { branchId },
      select: ['visionProblems'],
    });

    // Contar problemas visuales
    const problemsCount = new Map<string, number>();
    clinicalHistories.forEach((history) => {
      if (history.visionProblems) {
        const problems = history.visionProblems.split(',').map((p) => p.trim());
        problems.forEach((problem) => {
          if (problem) {
            problemsCount.set(problem, (problemsCount.get(problem) || 0) + 1);
          }
        });
      }
    });

    // Ordenar por frecuencia y tomar top 10
    const sortedProblems = Array.from(problemsCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      labels: sortedProblems.map(([problem]) => problem),
      data: sortedProblems.map(([, count]) => count),
      total: clinicalHistories.length,
    };
  }

  async getLaboratoryOrdersStatus(
    branchId: string
  ): Promise<LaboratoryOrdersStatusResponse> {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const orders = await this.laboratoryOrderRepository.find({
      where: {
        branchId,
      },
      select: ['isConfirmed'],
    });

    // Clasificar órdenes por estado isConfirmed
    let confirmed = 0;
    let pending = 0;

    orders.forEach((order) => {
      if (order.isConfirmed) {
        confirmed++;
      } else {
        pending++;
      }
    });

    return {
      labels: ['Pendientes', 'Confirmadas'],
      data: [pending, confirmed],
      total: orders.length,
    };
  }

  async getProductsInventory(
    branchId: string
  ): Promise<ProductsInventoryResponse> {
    const products = await this.productRepository.find({
      where: { branchId, isActive: true },
      select: ['name', 'quantity', 'brand'],
    });

    // Clasificar por nivel de stock
    let lowStock = 0;
    let mediumStock = 0;
    let highStock = 0;

    const lowStockProducts: string[] = [];
    const mediumStockProducts: string[] = [];
    const highStockProducts: string[] = [];

    products.forEach((product) => {
      if (product.quantity < 10) {
        lowStock++;
        lowStockProducts.push(product.name);
      } else if (product.quantity < 50) {
        mediumStock++;
        mediumStockProducts.push(product.name);
      } else {
        highStock++;
        highStockProducts.push(product.name);
      }
    });

    return {
      labels: ['Stock Bajo (<10)', 'Stock Medio (10-49)', 'Stock Alto (≥50)'],
      data: [lowStock, mediumStock, highStock],
      total: products.length,
      details: {
        lowStock: lowStockProducts.slice(0, 10),
        mediumStock: mediumStockProducts.slice(0, 10),
        highStock: highStockProducts.slice(0, 10),
      },
    };
  }

  async getShiftStatusDistribution(
    branchId: string
  ): Promise<ShiftStatusDistributionResponse> {
    const shifts = await this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.status', 'status')
      .where('shift.branchId = :branchId', { branchId })
      .getMany();

    // Contar por estado
    const statusCount = new Map<string, number>();
    shifts.forEach((shift) => {
      const statusName = shift.status?.name || 'Sin Estado';
      statusCount.set(statusName, (statusCount.get(statusName) || 0) + 1);
    });

    const labels: string[] = [];
    const data: number[] = [];
    statusCount.forEach((count, status) => {
      labels.push(status);
      data.push(count);
    });

    return {
      labels,
      data,
      total: shifts.length,
    };
  }

  async getPatientsAgeDemographics(
    branchId: string
  ): Promise<PatientsAgeDemographicsResponse> {
    const users = await this.userRepository.find({
      where: { branchId },
      select: ['dateOfBirth', 'firstName', 'lastName'],
    });

    // Calcular edades y agrupar
    const ageGroups = {
      '0-17': 0,
      '18-30': 0,
      '31-45': 0,
      '46-60': 0,
      '61-75': 0,
      '76+': 0,
    };

    const now = new Date();
    users.forEach((user) => {
      if (user.dateOfBirth) {
        const birthDate = new Date(user.dateOfBirth);
        const age = now.getFullYear() - birthDate.getFullYear();

        if (age <= 17) ageGroups['0-17']++;
        else if (age <= 30) ageGroups['18-30']++;
        else if (age <= 45) ageGroups['31-45']++;
        else if (age <= 60) ageGroups['46-60']++;
        else if (age <= 75) ageGroups['61-75']++;
        else ageGroups['76+']++;
      }
    });

    return {
      labels: Object.keys(ageGroups),
      data: Object.values(ageGroups),
      total: users.length,
    };
  }
}
