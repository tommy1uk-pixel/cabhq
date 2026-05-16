import { Controller, Get, Query } from '@nestjs/common';
import { LocationsService } from '../locations/locations.service';

@Controller('mapbox')
export class MapboxController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    return this.locationsService.searchMapbox(q);
  }

  @Get('retrieve')
  async retrieve(@Query('id') id: string) {
    return this.locationsService.retrievePostcoderAddress(id);
  }
}