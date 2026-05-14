import { Controller, Get, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('mapbox/search')
  async search(@Query('q') query: string) {
    return this.locationsService.searchMapbox(query);
  }

  @Get('mapbox/retrieve')
  async retrieve(@Query('id') id: string) {
    return this.locationsService.retrievePostcoderAddress(id);
  }

  @Get('locations/route')
  async getRoute(
    @Query('fromLat') fromLat: string,
    @Query('fromLng') fromLng: string,
    @Query('toLat') toLat: string,
    @Query('toLng') toLng: string,
  ) {
    return this.locationsService.getRoute({
      fromLat: Number(fromLat),
      fromLng: Number(fromLng),
      toLat: Number(toLat),
      toLng: Number(toLng),
    });
  }
}