import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { MapboxController } from './mapbox.controller';
import { MapboxService } from './mapbox.service';

@Module({
  imports: [LocationsModule],
  controllers: [MapboxController],
  providers: [MapboxService],
})
export class MapboxModule {}