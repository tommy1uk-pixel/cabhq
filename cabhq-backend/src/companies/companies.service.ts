import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
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
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: {
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
        createdAt: true,
        updatedAt: true,
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
        },
        select: {
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
          createdAt: true,
          updatedAt: true,
        },
      });

      if (dto.adminEmail?.trim() && dto.adminPassword?.trim()) {
        const email = dto.adminEmail.trim().toLowerCase();

        const existing = await tx.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (existing) {
          throw new BadRequestException('Admin email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

        await tx.user.create({
          data: {
            email,
            password: hashedPassword,
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

    const code = dto.code?.trim();
    const slug = dto.slug?.trim();

    if (code) {
      const conflict = await this.prisma.company.findFirst({
        where: { code, NOT: { id } },
        select: { id: true },
      });

      if (conflict) {
        throw new BadRequestException('Company code already exists');
      }
    }

    if (slug) {
      const conflict = await this.prisma.company.findFirst({
        where: { slug, NOT: { id } },
        select: { id: true },
      });

      if (conflict) {
        throw new BadRequestException('Company slug already exists');
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name,
        code: code ?? dto.code,
        slug: slug ?? dto.slug,
        status: dto.status,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
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
      },
      select: {
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
        createdAt: true,
        updatedAt: true,
      },
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

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
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

  async updateCompanyUserStatus(companyId: string, userId: string, status: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      throw new BadRequestException('Invalid status');
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

  async resetCompanyUserPassword(companyId: string, userId: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!password?.trim() || password.trim().length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  }
}