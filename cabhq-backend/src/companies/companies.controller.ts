import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { ResetCompanyUserPasswordDto } from './dto/reset-company-user-password.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.companiesService.update(id, {
      status: body.status,
    });
  }

  @Post(':id/users')
  createUser(@Param('id') id: string, @Body() dto: CreateCompanyUserDto) {
    return this.companiesService.createCompanyUser(id, dto);
  }

  @Patch(':id/users/:userId/status')
  updateUserStatus(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { status: string },
  ) {
    return this.companiesService.updateCompanyUserStatus(id, userId, body.status);
  }

  @Patch(':id/users/:userId/password')
  resetUserPassword(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: ResetCompanyUserPasswordDto,
  ) {
    return this.companiesService.resetCompanyUserPassword(id, userId, dto.password);
  }
}