import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriverJwtStrategy extends PassportStrategy(
  Strategy,
  'driver-jwt',
) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'changeme',
    });
  }

  async validate(payload: any) {
    if (payload.type !== 'DRIVER') {
      throw new UnauthorizedException();
    }

    const driver = await this.prisma.driver.findFirst({
      where: {
        id: payload.sub,
        companyId: payload.companyId,
      },
    });

    if (!driver) {
      throw new UnauthorizedException('Driver not found');
    }

    return {
      sub: driver.id,
      companyId: driver.companyId,
    };
  }
}