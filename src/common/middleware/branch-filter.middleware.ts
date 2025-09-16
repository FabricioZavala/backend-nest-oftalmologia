import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate as isUUID } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { Branch } from '../../modules/branches/entities/branch.entity';
import { User } from '../../modules/users/entities/user.entity';
import { AdminBranchSessionService } from '../services/admin-branch-session.service';

@Injectable()
export class BranchFilterMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private adminBranchSessionService: AdminBranchSessionService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Lista de rutas que NO requieren filtrado por sucursal
    const excludedRoutes = [
      'auth',
      'roles',
      'permission',
      'module',
      'files',
      'branches',
    ];

    const urlParts = req.originalUrl.split('/');
    const routeBase = urlParts[3];

    const shouldExclude = excludedRoutes.includes(routeBase);

    if (shouldExclude) {
      return next();
    }

    const authHeader = req.headers.authorization;
    let currentUser: User | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = this.jwtService.decode(token) as any;

        if (decoded && decoded.sub) {
          currentUser = await this.userRepository.findOne({
            where: { id: decoded.sub },
            relations: ['role', 'branch'],
          });
        }
      } catch (error) {}
    }

    let branchId: string;

    if (currentUser?.role?.roleName === 'Admin') {
      const adminBranchId = req.headers['x-admin-branch-id'] as string;

      if (adminBranchId) {
        branchId = adminBranchId;
        this.adminBranchSessionService.setAdminBranchSelection(
          currentUser.id,
          adminBranchId
        );
      } else {
        const savedAdminSelection =
          this.adminBranchSessionService.getAdminBranchSelection(
            currentUser.id
          );
        if (savedAdminSelection) {
          branchId = savedAdminSelection;
        } else {
          branchId = currentUser.branchId;
        }
      }
    } else {
      if (currentUser?.branchId) {
        branchId = currentUser.branchId;
      } else {
        console.warn(
          `Usuario ${currentUser?.id} no tiene sucursal asignada. Usando fallback.`
        );
        branchId = req.headers['x-branch-id'] as string;

        if (!branchId) {
          throw new BadRequestException({
            statusCode: 400,
            success: false,
            message: {
              es: 'El usuario no tiene una sucursal asignada. Contacte al administrador.',
              en: 'User does not have an assigned branch. Contact the administrator.',
            },
          });
        }
      }
    }

    if (!branchId) {
      throw new BadRequestException({
        statusCode: 400,
        success: false,
        message: {
          es: 'No se pudo determinar la sucursal. Verifique que el usuario tenga una sucursal asignada.',
          en: 'Could not determine branch. Please verify that the user has an assigned branch.',
        },
      });
    }

    if (!isUUID(branchId)) {
      throw new BadRequestException({
        statusCode: 400,
        success: false,
        message: {
          es: 'El formato del branch ID debe ser UUID válido',
          en: 'Branch ID must be a valid UUID format',
        },
      });
    }

    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException({
        statusCode: 404,
        success: false,
        message: {
          es: 'Sucursal no encontrada',
          en: 'Branch not found',
        },
      });
    }

    if (!branch.isActive) {
      throw new BadRequestException({
        statusCode: 400,
        success: false,
        message: {
          es: 'La sucursal no está activa',
          en: 'Branch is not active',
        },
      });
    }

    (req as any).branchId = branchId;
    (req as any).currentUser = currentUser;
    (req as any).isAdminFiltering =
      currentUser?.role?.roleName === 'Admin' &&
      req.headers['x-admin-branch-id'];

    next();
  }
}
