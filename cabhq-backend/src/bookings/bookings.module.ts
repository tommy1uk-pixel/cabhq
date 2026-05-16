import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [RealtimeModule, DispatchModule, LocationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService],
  exports: [BookingsService],
})
export class BookingsModule {}