import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftStatus } from '../entities/shift-status.entity';

@Injectable()
export class ShiftStatusSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(ShiftStatus)
    private shiftStatusRepository: Repository<ShiftStatus>
  ) {}

  async onModuleInit() {
    await this.seedDefaultStatuses();
  }

  private async seedDefaultStatuses() {
    const defaultStatuses = [
      {
        name: 'pending',
        description: 'Turno pendiente de confirmación',
        color: '#ffc107',
      },
      {
        name: 'confirmed',
        description: 'Turno confirmado',
        color: '#28a745',
      },
      {
        name: 'cancelled',
        description: 'Turno cancelado',
        color: '#dc3545',
      },
    ];

    for (const statusData of defaultStatuses) {
      const existingStatus = await this.shiftStatusRepository.findOne({
        where: { name: statusData.name },
      });

      if (!existingStatus) {
        const status = this.shiftStatusRepository.create(statusData);
        await this.shiftStatusRepository.save(status);
      }
    }
  }
}
