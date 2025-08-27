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
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { QueryUserDto } from './dtos/query-user.dto';
@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Post('create')
  async create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
  @Get('get-all')
  async findAll(@Query() queryDto: QueryUserDto) {
    return this.usersService.findAll(queryDto);
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto
  ) {
    return this.usersService.update(id, updateUserDto);
  }
  @Delete('delete/:id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
