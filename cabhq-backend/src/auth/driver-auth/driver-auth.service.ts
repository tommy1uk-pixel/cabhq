import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriverAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(phone: string, pin: string) {
    const cleanPhone = phone?.trim();
    const cleanPin = pin?.trim();

    if (!cleanPhone) {
      throw new BadRequestException('Phone is required');
    }

    if (!cleanPin) {
      throw new BadRequestException('PIN is required');
    }

    const driver = await this.prisma.driver.findFirst({
      where: {
        phone: cleanPhone,
      },
      include: {
        vehicle: true,
        documents: true,
      },
    });

    if (!driver) {
      throw new UnauthorizedException('Invalid phone or PIN');
    }

    if ((driver.pin ?? '').trim() !== cleanPin) {
      throw new UnauthorizedException('Invalid phone or PIN');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: driver.id,
      driverId: driver.id,
      companyId: driver.companyId,
      role: 'DRIVER',
      type: 'driver',
    });

    return {
      accessToken,
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        status: driver.status,
        companyId: driver.companyId,
        vehicle: driver.vehicle
          ? {
              id: driver.vehicle.id,
              reg: driver.vehicle.reg,
              make: driver.vehicle.make,
              model: driver.vehicle.model,
            }
          : null,
        documents: driver.documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          status: doc.status,
          expiryDate: doc.expiryDate,
        })),
      },
    };
  }

  async me(driverId: string, companyId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: {
        id: driverId,
        companyId,
      },
      include: {
        vehicle: true,
        documents: true,
      },
    });

    if (!driver) {
      throw new UnauthorizedException('Driver not found');
    }

    return {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      status: driver.status,
      companyId: driver.companyId,
      vehicle: driver.vehicle
        ? {
            id: driver.vehicle.id,
            reg: driver.vehicle.reg,
            make: driver.vehicle.make,
            model: driver.vehicle.model,
          }
        : null,
      documents: driver.documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        status: doc.status,
        expiryDate: doc.expiryDate,
      })),
    };
  }
}