import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../../prisma/prisma.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { DriverJwtStrategy } from './driver-jwt.strategy';

import { DriverAuthController } from './driver-auth/driver-auth.controller';
import { DriverAuthService } from './driver-auth/driver-auth.service';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'changeme',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, DriverAuthController],
  providers: [
    AuthService,
    DriverAuthService,
    JwtStrategy,
    DriverJwtStrategy,
  ],
  exports: [AuthService, DriverAuthService],
})
export class AuthModule {}