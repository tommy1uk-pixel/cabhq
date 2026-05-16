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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { AutoDispatchService } from '../dispatch/auto-dispatch.service';
import { CreateBookingDto } from './dto/create-booking.dto';

type AuthRequest = {
  user: {
    sub: string;
    companyId: string;
    email?: string;
    role?: string;
  };
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

type UpdateBookingBody = {
  pickup?: string;
  dropoff?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupTime?: string;
  pickupAt?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  bookerName?: string | null;
  bookerPhone?: string | null;
  bookerEmail?: string | null;
  passengerName?: string | null;
  passengerPhone?: string | null;
  passengerNotes?: string | null;
  passengerCount?: number | null;
  notes?: string | null;
  quotedPrice?: number | null;
  pricingMode?: string | null;
};

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly autoDispatchService: AutoDispatchService,
  ) {}

  @Get('track/:reference')
  async publicTracking(@Param('reference') reference: string) {
    return this.bookingsService.publicTracking(reference);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: AuthRequest) {
    return this.bookingsService.list(req.user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dispatch-board')
  async dispatchBoard(@Req() req: AuthRequest) {
    return this.bookingsService.dispatchBoard(req.user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/timeline')
  async timeline(@Req() req: AuthRequest, @Param('id') bookingId: string) {
    return this.bookingsService.timeline({
      bookingId,
      companyId: req.user.companyId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: AuthRequest, @Body() body: CreateBookingDto) {
    const bookerName =
      body.bookerName?.trim() || body.customerName?.trim() || null;

    const bookerPhone =
      body.bookerPhone?.trim() || body.customerPhone?.trim() || null;

    const isThirdPartyBooking = body.isThirdPartyBooking ?? false;

    const passengerName = isThirdPartyBooking
      ? body.passengerName?.trim() || null
      : body.passengerName?.trim() || bookerName;

    const passengerPhone = isThirdPartyBooking
      ? body.passengerPhone?.trim() || null
      : body.passengerPhone?.trim() || bookerPhone;

    return this.bookingsService.create({
      companyId: req.user.companyId,
      pickup: body.pickupAddress?.trim() || body.pickup?.trim() || '',
      dropoff: body.dropoffAddress?.trim() || body.dropoff?.trim() || '',
      pickupLat: body.pickupLat ?? body.pickupLatitude ?? null,
      pickupLng: body.pickupLng ?? body.pickupLongitude ?? null,
      dropoffLat: body.dropoffLat ?? body.dropoffLatitude ?? null,
      dropoffLng: body.dropoffLng ?? body.dropoffLongitude ?? null,
      pickupTime: body.pickupAt || body.pickupTime || '',
      pricingMode: body.pricingMode ?? null,
      quotedPrice: body.quotedPrice ?? null,
      calculatedFare: body.calculatedFare ?? null,
      distanceMiles: body.distanceMiles ?? null,
      durationMinutes: body.durationMinutes ?? null,
      autoDispatch: body.autoDispatch ?? false,
      customerName: body.customerName?.trim() || bookerName,
      customerPhone: body.customerPhone?.trim() || bookerPhone,
      passengerCount: body.passengerCount ?? null,
      notes: body.notes?.trim() || null,
      accountId: body.accountId?.trim() || null,
      isThirdPartyBooking,
      bookerName,
      bookerPhone,
      bookerEmail: body.bookerEmail?.trim() || null,
      passengerName,
      passengerPhone,
      passengerNotes: body.passengerNotes?.trim() || null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateBooking(
    @Req() req: AuthRequest,
    @Param('id') bookingId: string,
    @Body() body: UpdateBookingBody,
  ) {
    return this.bookingsService.updateBooking({
      bookingId,
      companyId: req.user.companyId,
      pickup: body.pickupAddress ?? body.pickup,
      dropoff: body.dropoffAddress ?? body.dropoff,
      pickupTime: body.pickupAt ?? body.pickupTime,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      bookerName: body.bookerName,
      bookerPhone: body.bookerPhone,
      bookerEmail: body.bookerEmail,
      passengerName: body.passengerName,
      passengerPhone: body.passengerPhone,
      passengerNotes: body.passengerNotes,
      passengerCount: body.passengerCount,
      notes: body.notes,
      quotedPrice: body.quotedPrice,
      pricingMode: body.pricingMode,
    });
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/auto-dispatch')
  async autoDispatch(@Req() req: AuthRequest, @Param('id') bookingId: string) {
    return this.autoDispatchService.startForBooking(
      bookingId,
      req.user.companyId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/offer/accept')
  async acceptOffer(
    @Req() req: AuthRequest,
    @Param('id') bookingId: string,
    @Body() body: AssignDriverBody,
  ) {
    return this.autoDispatchService.acceptOffer(
      bookingId,
      req.user.companyId,
      body.driverId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/offer/reject')
  async rejectOffer(
    @Req() req: AuthRequest,
    @Param('id') bookingId: string,
    @Body() body: AssignDriverBody,
  ) {
    return this.autoDispatchService.rejectOffer(
      bookingId,
      req.user.companyId,
      body.driverId,
    );
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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