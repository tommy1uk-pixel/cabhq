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

  isAirportBooking?: boolean;
  airportCode?: string | null;
  airportName?: string | null;
  airportTerminal?: string | null;
  flightNumber?: string | null;
  flightDirection?: string | null;
  flightDateTime?: string | null;
  airline?: string | null;
  meetAndGreet?: boolean;
  airportNotes?: string | null;
};

function cleanString(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function cleanAirportDirection(value?: string | null) {
  const cleaned = cleanString(value)?.toUpperCase();

  if (!cleaned) return null;

  if (['ARRIVAL', 'DEPARTURE', 'TRANSFER'].includes(cleaned)) {
    return cleaned;
  }

  return cleaned;
}

function parseOptionalDate(value?: string | null) {
  const cleaned = cleanString(value);

  if (!cleaned) return null;

  const date = new Date(cleaned);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

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
      cleanString(body.bookerName) || cleanString(body.customerName);

    const bookerPhone =
      cleanString(body.bookerPhone) || cleanString(body.customerPhone);

    const isThirdPartyBooking = body.isThirdPartyBooking ?? false;

    const passengerName = isThirdPartyBooking
      ? cleanString(body.passengerName)
      : cleanString(body.passengerName) || bookerName;

    const passengerPhone = isThirdPartyBooking
      ? cleanString(body.passengerPhone)
      : cleanString(body.passengerPhone) || bookerPhone;

    return this.bookingsService.create({
      companyId: req.user.companyId,
      pickup: cleanString(body.pickupAddress) || cleanString(body.pickup) || '',
      dropoff:
        cleanString(body.dropoffAddress) || cleanString(body.dropoff) || '',
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
      customerName: cleanString(body.customerName) || bookerName,
      customerPhone: cleanString(body.customerPhone) || bookerPhone,
      passengerCount: body.passengerCount ?? null,
      notes: cleanString(body.notes),
      accountId: cleanString(body.accountId),
      isThirdPartyBooking,
      bookerName,
      bookerPhone,
      bookerEmail: cleanString(body.bookerEmail),
      passengerName,
      passengerPhone,
      passengerNotes: cleanString(body.passengerNotes),

      isAirportBooking: body.isAirportBooking ?? false,
      airportCode: cleanString(body.airportCode),
      airportName: cleanString(body.airportName),
      airportTerminal: cleanString(body.airportTerminal),
      flightNumber: cleanString(body.flightNumber)?.toUpperCase() ?? null,
      flightDirection: cleanAirportDirection(body.flightDirection),
      flightDateTime: parseOptionalDate(body.flightDateTime),
      airline: cleanString(body.airline),
      meetAndGreet: body.meetAndGreet ?? false,
      airportNotes: cleanString(body.airportNotes),
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

      isAirportBooking: body.isAirportBooking,
      airportCode: body.airportCode,
      airportName: body.airportName,
      airportTerminal: body.airportTerminal,
      flightNumber: body.flightNumber,
      flightDirection: body.flightDirection,
      flightDateTime: body.flightDateTime,
      airline: body.airline,
      meetAndGreet: body.meetAndGreet,
      airportNotes: body.airportNotes,
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