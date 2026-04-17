import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DriverAppController } from './driver-app.controller';
import { DriverAppService } from './driver-app.service';
import { DriverAppAuthGuard } from './driver-app.guard';
import { DispatchModule } from '../dispatch/dispatch.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    DispatchModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me',
      signOptions: {
        expiresIn: '30d',
      },
    }),
  ],
  controllers: [DriverAppController],
  providers: [DriverAppService, DriverAppAuthGuard, PrismaService],
  exports: [DriverAppService],
})
export class DriverAppModule {}