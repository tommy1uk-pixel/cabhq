import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { DriverDispatchService } from './driver-dispatch.service';

@Controller('driver-dispatch')
@UseGuards(JwtAuthGuard)
export class DriverDispatchController {
  constructor(
    private readonly driverDispatchService: DriverDispatchService,
  ) {}

  @Get(':driverId/active-offer')
  async getActiveOffer(@Param('driverId') driverId: string) {
    return this.driverDispatchService.getActiveOffer(driverId);
  }

  @Get(':driverId/active-jobs')
  async getActiveJobs(@Param('driverId') driverId: string) {
    return this.driverDispatchService.getActiveJobs(driverId);
  }

  @Get(':driverId/job-history')
  async getJobHistory(@Param('driverId') driverId: string) {
    return this.driverDispatchService.getJobHistory(driverId);
  }

  @Post('respond')
  async respond(
    @Body()
    body: {
      bookingId: string;
      driverId: string;
      action: 'ACCEPT' | 'REJECT';
    },
  ) {
    return this.driverDispatchService.respond(body);
  }
}