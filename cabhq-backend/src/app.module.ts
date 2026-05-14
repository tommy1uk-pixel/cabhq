import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { DriversModule } from './drivers/drivers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { BookingsModule } from './bookings/bookings.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { PricingModule } from './pricing/pricing.module';
import { LocationsModule } from './locations/locations.module';
import { RealtimeModule } from './realtime/realtime.module';
import { DriverAppModule } from './driver-app/driver-app.module';
import { SettingsModule } from './settings/settings.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { AccountsModule } from './accounts/accounts.module';
import { MapboxModule } from './mapbox/mapbox.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    CompaniesModule,
    DriversModule,
    VehiclesModule,
    BookingsModule,
    DispatchModule,
    PricingModule,
    LocationsModule,
    RealtimeModule,
    DriverAppModule,
    SettingsModule,
    InvoicesModule,
    PaymentsModule,
    AccountsModule,
    MapboxModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}