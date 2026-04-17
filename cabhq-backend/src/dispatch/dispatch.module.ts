import { Module } from '@nestjs/common';
import { DispatchController } from './dispatch.controller';
import { AutoDispatchService } from './auto-dispatch.service';
import { DriverDispatchController } from './driver-dispatch.controller';
import { DriverDispatchService } from './driver-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [DispatchController, DriverDispatchController],
  providers: [AutoDispatchService, DriverDispatchService, PrismaService],
  exports: [AutoDispatchService, DriverDispatchService],
})
export class DispatchModule {}