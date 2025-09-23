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

@Controller('shift-management/shifts')
@UseGuards(AuthGuard('jwt'))
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('create')
  async create(@Body(ValidationPipe) createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Get('get-all')
  async findAll(@Query(ValidationPipe) queryDto: QueryShiftDto) {
    return this.shiftsService.findAll(queryDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateShiftDto: UpdateShiftDto
  ) {
    return this.shiftsService.update(id, updateShiftDto);
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string) {
    return this.shiftsService.remove(id);
  }
}
