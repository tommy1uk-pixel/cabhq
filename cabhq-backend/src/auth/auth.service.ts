import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User suspended');
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      type: 'USER',
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        type: 'USER',
        company: user.company
          ? {
              id: user.company.id,
              name: user.company.name,
            }
          : undefined,
      },
    };
  }

  async driverLogin(companyId: string, username: string, pin: string) {
    if (!companyId?.trim()) {
      throw new UnauthorizedException('Company required');
    }

    if (!username?.trim()) {
      throw new UnauthorizedException('Username required');
    }

    if (!pin?.trim()) {
      throw new UnauthorizedException('PIN required');
    }

    const driver = await this.prisma.driver.findFirst({
      where: {
        companyId: companyId.trim(),
        username: username.trim().toLowerCase(),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicle: true,
      },
    });

    if (!driver) {
      throw new UnauthorizedException('Invalid driver login');
    }

    if (driver.pin !== pin.trim()) {
      throw new UnauthorizedException('Invalid driver login');
    }

    if (['INACTIVE', 'SUSPENDED'].includes(driver.status)) {
      throw new UnauthorizedException('Driver suspended');
    }

    const token = await this.jwt.signAsync({
      sub: driver.id,
      role: 'DRIVER',
      companyId: driver.companyId,
      type: 'DRIVER',
      username: driver.username,
    });

    return {
      token,
      driver: {
        id: driver.id,
        name: driver.name,
        username: driver.username,
        phone: driver.phone,
        email: driver.email,
        status: driver.status,
        companyId: driver.companyId,
        type: 'DRIVER',
        company: driver.company,
        vehicle: driver.vehicle,
      },
    };
  }

  async me(id: string, role?: string) {
    if (role === 'DRIVER') {
      const driver = await this.prisma.driver.findUnique({
        where: { id },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          vehicle: true,
        },
      });

      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      return {
        id: driver.id,
        name: driver.name,
        username: driver.username,
        phone: driver.phone,
        email: driver.email,
        role: 'DRIVER',
        companyId: driver.companyId,
        type: 'DRIVER',
        company: driver.company,
        vehicle: driver.vehicle,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      type: 'USER',
      company: user.company
        ? {
            id: user.company.id,
            name: user.company.name,
          }
        : undefined,
    };
  }
}