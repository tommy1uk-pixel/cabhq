import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { DriverAuthController } from './driver-auth.controller';
import { DriverAuthService } from './driver-auth.service';
import { DriverJwtAuthGuard } from './driver-jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecret',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [DriverAuthController],
  providers: [DriverAuthService, DriverJwtAuthGuard, PrismaService],
  exports: [DriverAuthService, DriverJwtAuthGuard],
})
export class DriverAuthModule {}