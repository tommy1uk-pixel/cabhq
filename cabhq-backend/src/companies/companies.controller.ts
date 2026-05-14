import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';

import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { ResetCompanyUserPasswordDto } from './dto/reset-company-user-password.dto';

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
  ) {}

  /* =====================================================
     COMPANIES
  ===================================================== */

  @Get()
  async findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(id, dto);
  }

  /* =====================================================
     STATUS
  ===================================================== */

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status:
        | 'PENDING'
        | 'ACTIVE'
        | 'SUSPENDED';
    },
  ) {
    return this.companiesService.update(id, {
      status: body.status,
    });
  }

  /* =====================================================
     BILLING
  ===================================================== */

  @Get(':id/billing')
  async findBilling(
    @Param('id') id: string,
  ) {
    return this.companiesService.findBilling(id);
  }

  @Patch(':id/billing')
  async updateBilling(
    @Param('id') id: string,
    @Body()
    body: {
      billingPlan?:
        | 'STARTER'
        | 'GROWTH'
        | 'PRO'
        | 'ENTERPRISE';

      billingStatus?:
        | 'ACTIVE'
        | 'TRIAL'
        | 'PAST_DUE'
        | 'CANCELLED';

      trialEndsAt?: string | null;

      subscriptionStartsAt?: string | null;

      subscriptionEndsAt?: string | null;
    },
  ) {
    return this.companiesService.update(id, body);
  }

  @Post(':id/extend-trial')
  async extendTrial(
    @Param('id') id: string,
    @Body()
    body: {
      trialEndsAt: string;
    },
  ) {
    return this.companiesService.update(id, {
      billingStatus: 'TRIAL',
      trialEndsAt: body.trialEndsAt,
    });
  }

  /* =====================================================
     INVOICES
  ===================================================== */

  @Get(':id/invoices')
  async findInvoices(
    @Param('id') id: string,
  ) {
    return this.companiesService.findInvoices(id);
  }

  /* =====================================================
     COMPANY USERS
  ===================================================== */

  @Post(':id/users')
  async createUser(
    @Param('id') id: string,
    @Body() dto: CreateCompanyUserDto,
  ) {
    return this.companiesService.createCompanyUser(
      id,
      dto,
    );
  }

  @Patch(':id/users/:userId/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body()
    body: {
      status:
        | 'ACTIVE'
        | 'SUSPENDED';
    },
  ) {
    return this.companiesService.updateCompanyUserStatus(
      id,
      userId,
      body.status,
    );
  }

  @Patch(':id/users/:userId/password')
  async resetUserPassword(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body()
    dto: ResetCompanyUserPasswordDto,
  ) {
    return this.companiesService.resetCompanyUserPassword(
      id,
      userId,
      dto.password,
    );
  }
}