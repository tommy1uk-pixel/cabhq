import { Controller, Get, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('suggest')
  suggest(@Query('q') q: string) {
    return this.locationsService.suggest(q);
  }
}