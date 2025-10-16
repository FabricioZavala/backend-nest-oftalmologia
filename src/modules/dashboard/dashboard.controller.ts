import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { BranchContext } from '../../common/decorators/branch-context.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('appointments-trend')
  @RequirePermissions('dashboard_read')
  async getAppointmentsTrend(
    @BranchContext() branchId: string,
    @Query('months') months?: string
  ) {
    const monthsNumber = months ? parseInt(months, 10) : 6;
    return this.dashboardService.getAppointmentsTrend(branchId, monthsNumber);
  }

  @Get('diagnosis-frequency')
  @RequirePermissions('dashboard_read')
  async getDiagnosisFrequency(@BranchContext() branchId: string) {
    return this.dashboardService.getDiagnosisFrequency(branchId);
  }

  @Get('laboratory-orders-status')
  @RequirePermissions('dashboard_read')
  async getLaboratoryOrdersStatus(@BranchContext() branchId: string) {
    return this.dashboardService.getLaboratoryOrdersStatus(branchId);
  }

  @Get('products-inventory')
  @RequirePermissions('dashboard_read')
  async getProductsInventory(@BranchContext() branchId: string) {
    return this.dashboardService.getProductsInventory(branchId);
  }

  @Get('shift-status-distribution')
  @RequirePermissions('dashboard_read')
  async getShiftStatusDistribution(@BranchContext() branchId: string) {
    return this.dashboardService.getShiftStatusDistribution(branchId);
  }

  @Get('patients-age-demographics')
  @RequirePermissions('dashboard_read')
  async getPatientsAgeDemographics(@BranchContext() branchId: string) {
    return this.dashboardService.getPatientsAgeDemographics(branchId);
  }
}
