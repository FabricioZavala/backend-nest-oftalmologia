import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './entities/file.entity';
import { UploadFileDto } from './dtos/upload-file.dto';
import { QueryFileDto } from './dtos/query-file.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private fileRepository: Repository<File>
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    uploadFileDto: UploadFileDto
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException({
        messageKey: 'ERROR.FILE_REQUIRED',
        message: 'File is required',
      });
    }

    const maxSize = 8 * 1024 * 1024; // 8MB en bytes
    if (file.size > maxSize) {
      throw new BadRequestException({
        messageKey: 'ERROR.FILE_TOO_LARGE',
        message: 'File size exceeds 8MB limit',
      });
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (
      uploadFileDto.fileCategory === 'profile_photo' &&
      !allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new BadRequestException({
        messageKey: 'ERROR.INVALID_FILE_TYPE',
        message:
          'Only image files (JPEG, PNG, WebP, GIF) are allowed for profile photos',
      });
    }

    try {
      const uploadDir = path.join(
        process.cwd(),
        'uploads',
        uploadFileDto.entityType,
        uploadFileDto.fileCategory || 'general'
      );

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadDir, uniqueFilename);
      const relativePath = path.relative(process.cwd(), filePath);

      fs.writeFileSync(filePath, file.buffer);

      // Deactivate previous files of the same category for the entity
      if (uploadFileDto.fileCategory) {
        await this.fileRepository.update(
          {
            entityType: uploadFileDto.entityType,
            entityId: uploadFileDto.entityId,
            fileCategory: uploadFileDto.fileCategory,
          },
          { isActive: false }
        );
      }

      // Save file info to database
      const fileEntity = this.fileRepository.create({
        filename: uniqueFilename,
        originalName: file.originalname,
        path: relativePath.replace(/\\/g, '/'),
        size: file.size,
        mimeType: file.mimetype,
        entityType: uploadFileDto.entityType,
        entityId: uploadFileDto.entityId,
        fileCategory: uploadFileDto.fileCategory || 'general',
        isActive: true,
      });

      const savedFile = await this.fileRepository.save(fileEntity);

      const result = {
        messageKey: 'FILE.UPLOADED_SUCCESSFULLY',
        data: {
          id: savedFile.id,
          filename: savedFile.filename,
          originalName: savedFile.originalName,
          path: savedFile.path,
          size: savedFile.size,
          mimeType: savedFile.mimeType,
          url: savedFile.path.startsWith('/')
            ? savedFile.path
            : `/${savedFile.path}`,
        },
      };

      return result;
    } catch (error) {
      throw new InternalServerErrorException({
        messageKey: 'ERROR.FILE_UPLOAD_FAILED',
        message: 'Failed to upload file',
        details: error.message,
      });
    }
  }

  async findAll(queryFileDto: QueryFileDto): Promise<any> {
    const {
      entityType,
      entityId,
      fileCategory,
      isActive,
      page = 1,
      limit = 10,
    } = queryFileDto;

    const { skip, take } = PaginationUtil.getSkipAndTake({ page, limit });

    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .select([
        'file.id',
        'file.filename',
        'file.originalName',
        'file.path',
        'file.size',
        'file.mimeType',
        'file.entityType',
        'file.entityId',
        'file.fileCategory',
        'file.isActive',
        'file.createdAt',
        'file.updatedAt',
      ]);

    if (entityType) {
      queryBuilder.andWhere('file.entityType = :entityType', { entityType });
    }

    if (entityId) {
      queryBuilder.andWhere('file.entityId = :entityId', { entityId });
    }

    if (fileCategory) {
      queryBuilder.andWhere('file.fileCategory = :fileCategory', {
        fileCategory,
      });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('file.isActive = :isActive', { isActive });
    }

    queryBuilder.orderBy('file.createdAt', 'DESC').skip(skip).take(take);

    const [files, totalCount] = await queryBuilder.getManyAndCount();

    const filesWithUrls = files.map((file) => ({
      ...file,
      url: `/uploads/${file.path}`,
    }));

    const paginatedResult = PaginationUtil.paginate(filesWithUrls, totalCount, {
      page,
      limit,
    });

    return {
      messageKey: 'FILE.FOUND',
      data: paginatedResult,
    };
  }

  async findOne(id: string): Promise<any> {
    const file = await this.fileRepository.findOne({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'File not found',
      });
    }

    return {
      messageKey: 'FILE.FETCHED',
      data: {
        ...file,
        url: `/uploads/${file.path}`,
      },
    };
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    fileCategory?: string
  ): Promise<any> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .where('file.entityType = :entityType', { entityType })
      .andWhere('file.entityId = :entityId', { entityId })
      .andWhere('file.isActive = :isActive', { isActive: true });

    if (fileCategory) {
      queryBuilder.andWhere('file.fileCategory = :fileCategory', {
        fileCategory,
      });
    }

    queryBuilder.orderBy('file.createdAt', 'DESC');

    const files = await queryBuilder.getMany();

    const filesWithUrls = files.map((file) => ({
      ...file,
      url: `/uploads/${file.path}`,
    }));

    return {
      messageKey: 'FILE.FOUND',
      data: filesWithUrls,
    };
  }

  async remove(id: string): Promise<any> {
    const file = await this.fileRepository.findOne({ where: { id } });

    if (!file) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'File not found',
      });
    }

    try {
      const filePath = path.join(process.cwd(), file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await this.fileRepository.remove(file);

      return {
        messageKey: 'FILE.DELETED',
        data: { id },
      };
    } catch (error) {
      throw new InternalServerErrorException({
        messageKey: 'ERROR.FILE_DELETE_FAILED',
        message: 'Failed to delete file',
        details: error.message,
      });
    }
  }

  async deactivateFile(id: string): Promise<any> {
    const file = await this.fileRepository.findOne({ where: { id } });

    if (!file) {
      throw new NotFoundException({
        messageKey: 'ERROR.NOT_FOUND',
        message: 'File not found',
      });
    }

    await this.fileRepository.update(id, { isActive: false });

    return {
      messageKey: 'FILE.DEACTIVATED',
      data: { id },
    };
  }
}
