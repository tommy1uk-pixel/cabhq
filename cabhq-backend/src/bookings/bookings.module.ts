import { Module } from '@nestjs/common';

import { DispatchModule } from '../dispatch/dispatch.module';
import { LocationsModule } from '../locations/locations.module';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { RoutingModule } from '../routing/routing.module';

import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    RealtimeModule,
    DispatchModule,
    LocationsModule,
    RoutingModule,
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    PrismaService,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}