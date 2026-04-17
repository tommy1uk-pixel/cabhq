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
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { AutoDispatchService } from '../dispatch/auto-dispatch.service';

type AuthRequest = {
  user: {
    sub: string;
    companyId: string;
    email?: string;
    role?: string;
  };
};

type CreateBookingBody = {
  pickup: string;
  dropoff: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  pickupTime: string;
  pricingMode?: string | null;
  quotedPrice?: number | null;
  calculatedFare?: number | null;
  distanceMiles?: number | null;
  durationMinutes?: number | null;
  autoDispatch?: boolean;
};

type AssignDriverBody = {
  driverId: string;
};

type CancelBookingBody = {
  reason?: string | null;
};

type UpdateBookingStatusBody = {
  status: string;
};

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly autoDispatchService: AutoDispatchService,
  ) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    return this.bookingsService.list(req.user.companyId);
  }

  @Get('dispatch-board')
  async dispatchBoard(@Req() req: AuthRequest) {
    return this.bookingsService.dispatchBoard(req.user.companyId);
  }

  @Post()
  async create(
    @Req() req: AuthRequest,
    @Body() body: CreateBookingBody,
  ) {
    return this.bookingsService.create({
      companyId: req.user.companyId,
      pickup: body.pickup,
      dropoff: body.dropoff,
      pickupLat: body.pickupLat ?? null,
      pickupLng: body.pickupLng ?? null,
      dropoffLat: body.dropoffLat ?? null,
      dropoffLng: body.dropoffLng ?? null,
      pickupTime: body.pickupTime,
      pricingMode: body.pricingMode ?? null,
      quotedPrice: body.quotedPrice ?? null,
      calculatedFare: body.calculatedFare ?? null,
      distanceMiles: body.distanceMiles ?? null,
      durationMinutes: body.durationMinutes ?? null,
      autoDispatch: body.autoDispatch ?? false,
    });
  }

  @Post(':id/assign-driver')
  async assignDriver(
    @Req() req: AuthRequest,
    @Param('id') bookingId: string,
    @Body() body: AssignDriverBody,
  ) {
    return this.bookingsService.assignDriver({
      bookingId,
      companyId: req.user.companyId,
      driverId: body.driverId,
    });
  }

  @Post(':id/reassign-driver')
  async reassignDriver(
    @Req() req: AuthRequest,
    @Param('id') bookingId: string,
    @Body() body: AssignDriverBody,
  ) {
    return this.bookingsService.reassignDriver({
      bookingId,
      companyId: req.user.companyId,
      driverId: body.driverId,
    });
  }

  @Post(':id/unassign-driver')
  async unassignDriver(
    @Req() req: AuthRequest,
    @Param('id') bookingId: string,
  ) {
    return this.bookingsService.unassignDriver({
      bookingId,
      companyId: req.user.companyId,
    });
  }

  @Post(':id/auto-dispatch')
  async autoDispatch(
    @Req() req: AuthRequest,
    @Param('id') bookingId: string,
  ) {
    return this.autoDispatchService.startForBooking(
      bookingId,
      req.user.companyId,
    );
  }

  @Post(':id/cancel')
  async cancelBooking(
    @Req() req: AuthRequest,
    @Param('id') bookingId: string,
    @Body() body: CancelBookingBody,
  ) {
    return this.bookingsService.cancelBooking({
      bookingId,
      companyId: req.user.companyId,
      reason: body.reason ?? null,
    });
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: AuthRequest,
    @Param('id') bookingId: string,
    @Body() body: UpdateBookingStatusBody,
  ) {
    return this.bookingsService.updateStatus({
      bookingId,
      companyId: req.user.companyId,
      status: body.status,
    });
  }
}