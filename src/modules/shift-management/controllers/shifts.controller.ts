import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShiftsService } from '../services/shifts.service';
import { CreateShiftDto } from '../dtos/create-shift.dto';
import { UpdateShiftDto } from '../dtos/update-shift.dto';
import { QueryShiftDto } from '../dtos/query-shift.dto';
import { BranchContext } from '../../../common/decorators/branch-context.decorator';

@Controller('shift-management/shifts')
@UseGuards(AuthGuard('jwt'))
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('create')
  async create(
    @Body(ValidationPipe) createShiftDto: CreateShiftDto,
    @BranchContext() branchId: string
  ) {
    return this.shiftsService.create(createShiftDto, branchId);
  }

  @Get('get-all')
  async findAll(
    @Query(ValidationPipe) queryDto: QueryShiftDto,
    @BranchContext() branchId: string
  ) {
    return this.shiftsService.findAll(queryDto, branchId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @BranchContext() branchId: string) {
    return this.shiftsService.findOne(id, branchId);
  }

  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateShiftDto: UpdateShiftDto,
    @BranchContext() branchId: string
  ) {
    return this.shiftsService.update(id, updateShiftDto, branchId);
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string, @BranchContext() branchId: string) {
    return this.shiftsService.remove(id, branchId);
  }
}
