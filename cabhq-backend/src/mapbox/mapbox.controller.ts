import { Controller, Get, Query } from '@nestjs/common';
import { MapboxService } from './mapbox.service';

@Controller('mapbox')
export class MapboxController {
  constructor(private readonly mapboxService: MapboxService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    return this.mapboxService.search(q);
  }

  @Get('retrieve')
  async retrieve(@Query('id') id: string) {
    return this.mapboxService.retrieve(id);
  }
}