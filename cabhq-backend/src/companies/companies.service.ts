import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

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
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            email: true,
            role: true,
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
      const company = await tx.company.create({
        data: {
          name: dto.name.trim(),
          code: dto.code?.trim() || null,
          slug: dto.slug?.trim() || null,
          status: dto.status || 'ACTIVE',
          contactName: dto.contactName?.trim() || null,
          contactEmail: dto.contactEmail?.trim() || null,
          contactPhone: dto.contactPhone?.trim() || null,
          timezone: dto.timezone || 'Europe/London',
          currency: dto.currency || 'GBP',
          driverLimit: dto.driverLimit ?? 25,
          vehicleLimit: dto.vehicleLimit ?? 25,
          dispatcherSeatLimit: dto.dispatcherSeatLimit ?? 3,
          updatedAt: new Date(),
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

    return this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        slug: dto.slug,
        status: dto.status,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        timezone: dto.timezone,
        currency: dto.currency,
        driverLimit: dto.driverLimit,
        vehicleLimit: dto.vehicleLimit,
        dispatcherSeatLimit: dto.dispatcherSeatLimit,
        updatedAt: new Date(),
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
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}