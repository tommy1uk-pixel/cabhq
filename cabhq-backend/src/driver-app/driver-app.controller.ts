import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DriverAppService } from './driver-app.service';
import { DriverAppAuthGuard } from './driver-app.guard';

type DriverAppRequest = {
  user: {
    sub: string;
    driverId: string;
    companyId: string;
    role: string;
    type: string;
  };
};

@Controller('driver-app')
export class DriverAppController {
  constructor(private readonly driverAppService: DriverAppService) {}

  @Post('login')
  async login(@Body() body: { driverId?: string; phone?: string; pin: string }) {
    return this.driverAppService.login(body);
  }

  @UseGuards(DriverAppAuthGuard)
  @Get('me/bootstrap')
  async bootstrap(@Req() req: DriverAppRequest) {
    return this.driverAppService.bootstrap(req.user.driverId);
  }

  @UseGuards(DriverAppAuthGuard)
  @Get('me')
  async getMe(@Req() req: DriverAppRequest) {
    return this.driverAppService.getDriverProfile(req.user.driverId);
  }

  @UseGuards(DriverAppAuthGuard)
  @Get('me/offer')
  async getOffer(@Req() req: DriverAppRequest) {
    return this.driverAppService.getActiveOffer(req.user.driverId);
  }

  @UseGuards(DriverAppAuthGuard)
  @Get('me/jobs/active')
  async getActiveJobs(@Req() req: DriverAppRequest) {
    return this.driverAppService.getActiveJobs(req.user.driverId);
  }

  @UseGuards(DriverAppAuthGuard)
  @Get('me/jobs/history')
  async getJobHistory(@Req() req: DriverAppRequest) {
    return this.driverAppService.getJobHistory(req.user.driverId);
  }

  @UseGuards(DriverAppAuthGuard)
  @Post('me/offer/respond')
  async respondToOffer(
    @Req() req: DriverAppRequest,
    @Body() body: { bookingId: string; action: 'ACCEPT' | 'REJECT' },
  ) {
    return this.driverAppService.respondToOffer({
      driverId: req.user.driverId,
      bookingId: body.bookingId,
      action: body.action,
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Patch('me/status')
  async updateStatus(
    @Req() req: DriverAppRequest,
    @Body()
    body: {
      status: 'ONLINE' | 'OFF_DUTY' | 'AVAILABLE' | 'BUSY' | 'ON_DUTY';
    },
  ) {
    return this.driverAppService.updateDriverStatus({
      driverId: req.user.driverId,
      status: body.status,
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Post('me/location')
  async updateLocation(
    @Req() req: DriverAppRequest,
    @Body()
    body: {
      latitude: number;
      longitude: number;
      heading?: number | null;
      speed?: number | null;
    },
  ) {
    return this.driverAppService.updateLocation({
      driverId: req.user.driverId,
      latitude: body.latitude,
      longitude: body.longitude,
      heading: body.heading ?? null,
      speed: body.speed ?? null,
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Post('me/jobs/:bookingId/en-route')
  async markEnRoute(
    @Req() req: DriverAppRequest,
    @Param('bookingId') bookingId: string,
  ) {
    return this.driverAppService.markJobStatus({
      driverId: req.user.driverId,
      bookingId,
      nextStatus: 'EN_ROUTE',
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Post('me/jobs/:bookingId/arrived')
  async markArrived(
    @Req() req: DriverAppRequest,
    @Param('bookingId') bookingId: string,
  ) {
    return this.driverAppService.markJobStatus({
      driverId: req.user.driverId,
      bookingId,
      nextStatus: 'ARRIVED',
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Post('me/jobs/:bookingId/on-job')
  async markOnJob(
    @Req() req: DriverAppRequest,
    @Param('bookingId') bookingId: string,
  ) {
    return this.driverAppService.markJobStatus({
      driverId: req.user.driverId,
      bookingId,
      nextStatus: 'ON_JOB',
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Post('me/jobs/:bookingId/start')
  async startJobAlias(
    @Req() req: DriverAppRequest,
    @Param('bookingId') bookingId: string,
  ) {
    return this.driverAppService.markJobStatus({
      driverId: req.user.driverId,
      bookingId,
      nextStatus: 'ON_JOB',
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Post('me/jobs/:bookingId/complete')
  async completeJob(
    @Req() req: DriverAppRequest,
    @Param('bookingId') bookingId: string,
  ) {
    return this.driverAppService.markJobStatus({
      driverId: req.user.driverId,
      bookingId,
      nextStatus: 'COMPLETED',
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Post('me/jobs/:bookingId/no-show')
  async noShowJob(
    @Req() req: DriverAppRequest,
    @Param('bookingId') bookingId: string,
  ) {
    return this.driverAppService.markJobStatus({
      driverId: req.user.driverId,
      bookingId,
      nextStatus: 'NO_SHOW',
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Post('me/shift/start')
  async startShift(
    @Req() req: DriverAppRequest,
    @Body()
    body: {
      notes?: string | null;
      startStatus?: 'ONLINE' | 'ON_DUTY' | 'AVAILABLE' | null;
    },
  ) {
    return this.driverAppService.startShift({
      driverId: req.user.driverId,
      notes: body.notes ?? null,
      startStatus: body.startStatus ?? null,
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Post('me/shift/end')
  async endShift(
    @Req() req: DriverAppRequest,
    @Body()
    body: {
      notes?: string | null;
      endStatus?: 'OFF_DUTY' | 'AVAILABLE' | null;
    },
  ) {
    return this.driverAppService.endShift({
      driverId: req.user.driverId,
      notes: body.notes ?? null,
      endStatus: body.endStatus ?? null,
    });
  }

  @UseGuards(DriverAppAuthGuard)
  @Get('me/shift/current')
  async getCurrentShift(@Req() req: DriverAppRequest) {
    return this.driverAppService.getCurrentShift(req.user.driverId);
  }

  @UseGuards(DriverAppAuthGuard)
  @Get('me/shifts/history')
  async getShiftHistory(@Req() req: DriverAppRequest) {
    return this.driverAppService.getShiftHistory(req.user.driverId);
  }
}