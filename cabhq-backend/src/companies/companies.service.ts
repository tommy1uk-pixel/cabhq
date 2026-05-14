import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private companySelect() {
    return {
      id: true,
      name: true,
      code: true,
      slug: true,
      status: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      timezone: true,
      currency: true,
      driverLimit: true,
      vehicleLimit: true,
      dispatcherSeatLimit: true,
      billingPlan: true,
      billingStatus: true,
      trialEndsAt: true,
      subscriptionStartsAt: true,
      subscriptionEndsAt: true,
      internalNotes: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private getPlanPrice(plan: string) {
    if (plan === 'STARTER') return 49;
    if (plan === 'GROWTH') return 89;
    if (plan === 'PRO') return 149;
    return 249;
  }

  async findAll() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.companySelect(),
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: {
        ...this.companySelect(),
        users: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async findBilling(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        billingPlan: true,
        billingStatus: true,
        trialEndsAt: true,
        subscriptionStartsAt: true,
        subscriptionEndsAt: true,
        currency: true,
        createdAt: true,
        invoices: {
          select: {
            id: true,
            status: true,
            balanceDue: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const unpaidInvoices = company.invoices.filter((invoice) =>
      ['DRAFT', 'SENT', 'PART_PAID', 'OVERDUE'].includes(invoice.status),
    ).length;

    return {
      companyId: company.id,
      companyName: company.name,
      billingPlan: company.billingPlan,
      billingStatus: company.billingStatus,
      trialEndsAt: company.trialEndsAt,
      subscriptionStartsAt: company.subscriptionStartsAt,
      subscriptionEndsAt: company.subscriptionEndsAt,
      monthlyPrice: this.getPlanPrice(company.billingPlan),
      unpaidInvoices,
      currency: company.currency ?? 'GBP',
      createdAt: company.createdAt,
    };
  }

  async findInvoices(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        currency: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { companyId: id },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        companyId: true,
        invoiceNumber: true,
        status: true,
        total: true,
        paidAmount: true,
        balanceDue: true,
        dueDate: true,
        createdAt: true,
      },
    });

    return invoices.map((invoice) => ({
      ...invoice,
      amount: invoice.total,
      currency: company.currency ?? 'GBP',
      paidAt: invoice.status === 'PAID' ? invoice.createdAt : null,
    }));
  }

  async create(dto: CreateCompanyDto) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Company name required');
    }

    return this.prisma.$transaction(async (tx) => {
      const code = dto.code?.trim() || null;
      const slug = dto.slug?.trim() || null;

      if (code) {
        const existingCode = await tx.company.findFirst({
          where: { code },
          select: { id: true },
        });

        if (existingCode) {
          throw new BadRequestException('Company code already exists');
        }
      }

      if (slug) {
        const existingSlug = await tx.company.findFirst({
          where: { slug },
          select: { id: true },
        });

        if (existingSlug) {
          throw new BadRequestException('Company slug already exists');
        }
      }

      if (dto.adminEmail?.trim()) {
        const existingUser = await tx.user.findUnique({
          where: { email: dto.adminEmail.trim().toLowerCase() },
          select: { id: true },
        });

        if (existingUser) {
          throw new BadRequestException('Admin email already exists');
        }
      }

      const company = await tx.company.create({
        data: {
          name: dto.name.trim(),
          code,
          slug,
          status: dto.status ?? 'PENDING',
          contactName: dto.contactName?.trim() || null,
          contactEmail: dto.contactEmail?.trim() || null,
          contactPhone: dto.contactPhone?.trim() || null,
          timezone: dto.timezone ?? 'Europe/London',
          currency: dto.currency ?? 'GBP',
          driverLimit: dto.driverLimit ?? 10,
          vehicleLimit: dto.vehicleLimit ?? 10,
          dispatcherSeatLimit: dto.dispatcherSeatLimit ?? 3,
          billingPlan: dto.billingPlan ?? 'STARTER',
          billingStatus: dto.billingStatus ?? 'TRIAL',
          trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : null,
          subscriptionStartsAt: dto.subscriptionStartsAt
            ? new Date(dto.subscriptionStartsAt)
            : null,
          subscriptionEndsAt: dto.subscriptionEndsAt
            ? new Date(dto.subscriptionEndsAt)
            : null,
          internalNotes: dto.internalNotes?.trim() || null,
        },
        select: this.companySelect(),
      });

      if (dto.adminEmail?.trim() && dto.adminPassword?.trim()) {
        if (dto.adminPassword.trim().length < 8) {
          throw new BadRequestException(
            'Admin password must be at least 8 characters',
          );
        }

        await tx.user.create({
          data: {
            email: dto.adminEmail.trim().toLowerCase(),
            password: await bcrypt.hash(dto.adminPassword.trim(), 10),
            role: 'ADMIN',
            status: 'ACTIVE',
            companyId: company.id,
          },
        });
      }

      return company;
    });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const existing = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    const code =
      dto.code === undefined ? undefined : dto.code?.trim() || null;

    const slug =
      dto.slug === undefined ? undefined : dto.slug?.trim() || null;

    if (code) {
      const conflict = await this.prisma.company.findFirst({
        where: {
          code,
          NOT: { id },
        },
        select: { id: true },
      });

      if (conflict) {
        throw new BadRequestException('Company code already exists');
      }
    }

    if (slug) {
      const conflict = await this.prisma.company.findFirst({
        where: {
          slug,
          NOT: { id },
        },
        select: { id: true },
      });

      if (conflict) {
        throw new BadRequestException('Company slug already exists');
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim(),
        code,
        slug,
        status: dto.status,
        contactName:
          dto.contactName === undefined
            ? undefined
            : dto.contactName?.trim() || null,
        contactEmail:
          dto.contactEmail === undefined
            ? undefined
            : dto.contactEmail?.trim() || null,
        contactPhone:
          dto.contactPhone === undefined
            ? undefined
            : dto.contactPhone?.trim() || null,
        timezone: dto.timezone,
        currency: dto.currency,
        driverLimit: dto.driverLimit,
        vehicleLimit: dto.vehicleLimit,
        dispatcherSeatLimit: dto.dispatcherSeatLimit,
        billingPlan: dto.billingPlan,
        billingStatus: dto.billingStatus,
        trialEndsAt:
          dto.trialEndsAt === undefined
            ? undefined
            : dto.trialEndsAt
              ? new Date(dto.trialEndsAt)
              : null,
        subscriptionStartsAt:
          dto.subscriptionStartsAt === undefined
            ? undefined
            : dto.subscriptionStartsAt
              ? new Date(dto.subscriptionStartsAt)
              : null,
        subscriptionEndsAt:
          dto.subscriptionEndsAt === undefined
            ? undefined
            : dto.subscriptionEndsAt
              ? new Date(dto.subscriptionEndsAt)
              : null,
        internalNotes:
          dto.internalNotes === undefined
            ? undefined
            : dto.internalNotes?.trim() || null,
      },
      select: this.companySelect(),
    });
  }

  async extendTrial(companyId: string, trialEndsAt: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!trialEndsAt) {
      throw new BadRequestException('Trial end date required');
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        billingStatus: 'TRIAL',
        trialEndsAt: new Date(trialEndsAt),
      },
      select: this.companySelect(),
    });
  }

  async createCompanyUser(companyId: string, dto: CreateCompanyUserDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const email = dto.email?.trim().toLowerCase();
    const password = dto.password?.trim();
    const role = dto.role;

    if (!email) {
      throw new BadRequestException('Email required');
    }

    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    if (!['ADMIN', 'OPERATOR', 'DRIVER', 'SUPER_ADMIN'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('User email already exists');
    }

    return this.prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        role,
        status: 'ACTIVE',
        companyId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async updateCompanyUserStatus(
    companyId: string,
    userId: string,
    status: string,
  ) {
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async resetCompanyUserPassword(
    companyId: string,
    userId: string,
    password: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!password?.trim() || password.trim().length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: await bcrypt.hash(password.trim(), 10),
      },
    });

    return { success: true };
  }
}