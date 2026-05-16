import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AutoDispatchService } from '../dispatch/auto-dispatch.service';
import { LocationsService } from '../locations/locations.service';

type CreateBookingInput = {
  companyId: string;
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
  customerName?: string | null;
  customerPhone?: string | null;
  passengerCount?: number | null;
  notes?: string | null;
  accountId?: string | null;
  isThirdPartyBooking?: boolean;
  bookerName?: string | null;
  bookerPhone?: string | null;
  bookerEmail?: string | null;
  passengerName?: string | null;
  passengerPhone?: string | null;
  passengerNotes?: string | null;
};

type UpdateBookingInput = {
  bookingId: string;
  companyId: string;
  pickup?: string;
  dropoff?: string;
  pickupTime?: string;
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

type AssignDriverInput = {
  bookingId: string;
  companyId: string;
  driverId: string;
};

type ReassignDriverInput = AssignDriverInput;

type UnassignDriverInput = {
  bookingId: string;
  companyId: string;
};

type CancelBookingInput = {
  bookingId: string;
  companyId: string;
  reason?: string | null;
};

type UpdateBookingStatusInput = {
  bookingId: string;
  companyId: string;
  status: string;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly autoDispatchService: AutoDispatchService,
    private readonly locationsService: LocationsService,
  ) {}

  async list(companyId: string) {
    return this.prisma.booking.findMany({
      where: { companyId },
      include: this.bookingInclude(),
      orderBy: [{ pickupTime: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async dispatchBoard(companyId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { companyId },
      include: this.bookingInclude(),
      orderBy: [{ pickupTime: 'asc' }, { createdAt: 'desc' }],
    });

    return Promise.all(
      bookings.map(async (booking) => {
        const suggestedDrivers = this.shouldLoadSuggestedDrivers(booking.status)
          ? await this.autoDispatchService.getSuggestedDriversForBooking(
              booking.id,
              booking.companyId,
              3,
            )
          : [];

        return {
          ...booking,
          suggestedDrivers,
          pickupLatitude: booking.pickupLat ?? null,
          pickupLongitude: booking.pickupLng ?? null,
          dropoffLatitude: booking.dropoffLat ?? null,
          dropoffLongitude: booking.dropoffLng ?? null,
          pickupAddress: booking.pickup,
          dropoffAddress: booking.dropoff,
          pickupAt: booking.pickupTime,
        };
      }),
    );
  }

  async publicTracking(reference: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        reference: reference.trim(),
      },
      include: {
        driver: {
          include: {
            vehicle: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        events: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 20,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      reference: booking.reference,
      status: booking.status,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      pickupLat: booking.pickupLat ?? null,
      pickupLng: booking.pickupLng ?? null,
      dropoffLat: booking.dropoffLat ?? null,
      dropoffLng: booking.dropoffLng ?? null,
      pickupTime: booking.pickupTime,
      quotedPrice: booking.quotedPrice,
      pricingMode: booking.pricingMode,
      company: booking.company
        ? {
            id: booking.company.id,
            name: booking.company.name,
          }
        : null,
      driver: booking.driver
        ? {
            id: booking.driver.id,
            name: booking.driver.name,
            phone: booking.driver.phone ?? null,
            latitude: booking.driver.latitude ?? null,
            longitude: booking.driver.longitude ?? null,
            heading: booking.driver.heading ?? null,
            speed: booking.driver.speed ?? null,
            lastLocationAt: booking.driver.lastLocationAt ?? null,
            vehicle: booking.driver.vehicle
              ? {
                  reg: booking.driver.vehicle.reg ?? null,
                  plateNumber: booking.driver.vehicle.plateNumber ?? null,
                  make: booking.driver.vehicle.make ?? null,
                  model: booking.driver.vehicle.model ?? null,
                  colour: booking.driver.vehicle.colour ?? null,
                }
              : null,
          }
        : null,
      timeline: booking.events.map((event) => ({
        id: event.id,
        message: event.message,
        createdAt: event.createdAt,
      })),
    };
  }

  async timeline(input: { bookingId: string; companyId: string }) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        companyId: input.companyId,
      },
      select: { id: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return this.prisma.bookingEvent.findMany({
      where: { bookingId: input.bookingId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async create(input: CreateBookingInput) {
    if (!input.pickup?.trim()) {
      throw new BadRequestException('Pickup is required');
    }

    if (!input.dropoff?.trim()) {
      throw new BadRequestException('Dropoff is required');
    }

    if (!input.pickupTime?.trim()) {
      throw new BadRequestException('Pickup time is required');
    }

    const pickupTime = new Date(input.pickupTime);

    if (Number.isNaN(pickupTime.getTime())) {
      throw new BadRequestException('Pickup time is invalid');
    }

    let accountId: string | null = null;
    let accountName: string | null = null;

    if (input.accountId) {
      const account = await this.prisma.account.findFirst({
        where: {
          id: input.accountId,
          companyId: input.companyId,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

      if (!account) {
        throw new BadRequestException('Account not found');
      }

      if (account.status === 'CLOSED') {
        throw new BadRequestException(
          'Cannot create booking for a closed account',
        );
      }

      accountId = account.id;
      accountName = account.name;
    }

    const reference = this.generateBookingReference();
    const isThirdPartyBooking = input.isThirdPartyBooking ?? false;

    const bookerName =
      input.bookerName?.trim() || input.customerName?.trim() || null;

    const bookerPhone =
      input.bookerPhone?.trim() || input.customerPhone?.trim() || null;

    const passengerName = isThirdPartyBooking
      ? input.passengerName?.trim() || null
      : input.passengerName?.trim() || bookerName;

    const passengerPhone = isThirdPartyBooking
      ? input.passengerPhone?.trim() || null
      : input.passengerPhone?.trim() || bookerPhone;

    let pickupLat = input.pickupLat ?? null;
    let pickupLng = input.pickupLng ?? null;
    let dropoffLat = input.dropoffLat ?? null;
    let dropoffLng = input.dropoffLng ?? null;

    if (pickupLat === null || pickupLng === null) {
      const pickupCoords = await this.locationsService.geocodeAddress(
        input.pickup.trim(),
      );

      pickupLat = pickupCoords.latitude ?? null;
      pickupLng = pickupCoords.longitude ?? null;
    }

    if (dropoffLat === null || dropoffLng === null) {
      const dropoffCoords = await this.locationsService.geocodeAddress(
        input.dropoff.trim(),
      );

      dropoffLat = dropoffCoords.latitude ?? null;
      dropoffLng = dropoffCoords.longitude ?? null;
    }

    const booking = await this.prisma.booking.create({
      data: {
        companyId: input.companyId,
        accountId,
        reference,
        pickup: input.pickup.trim(),
        dropoff: input.dropoff.trim(),
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        pickupTime,
        status: 'BOOKED',
        pricingMode: input.pricingMode ?? null,
        quotedPrice: input.quotedPrice ?? null,
        calculatedFare: input.calculatedFare ?? null,
        distanceMiles: input.distanceMiles ?? null,
        durationMinutes: input.durationMinutes ?? null,
        customerName: bookerName,
        customerPhone: bookerPhone,
        isThirdPartyBooking,
        bookerName,
        bookerPhone,
        bookerEmail: input.bookerEmail?.trim() || null,
        passengerName,
        passengerPhone,
        passengerNotes: input.passengerNotes?.trim() || null,
        passengerCount: input.passengerCount ?? null,
        notes: input.notes?.trim() || null,
      },
    });

    await this.appendTimeline(
      booking.id,
      this.timelineMessage.bookingCreated({
        reference: booking.reference,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        pickupTime: booking.pickupTime,
      }),
    );

    if (accountName) {
      await this.appendTimeline(
        booking.id,
        `ACCOUNT LINKED · ${accountName} [${accountId}]`,
      );
    }

    if (bookerName || bookerPhone || input.passengerCount != null) {
      await this.appendTimeline(
        booking.id,
        this.timelineMessage.customerCaptured({
          customerName: bookerName,
          customerPhone: bookerPhone,
          passengerCount: input.passengerCount ?? null,
        }),
      );
    }

    if (isThirdPartyBooking || passengerName || passengerPhone) {
      await this.appendTimeline(
        booking.id,
        this.timelineMessage.passengerCaptured({
          isThirdPartyBooking,
          passengerName,
          passengerPhone,
        }),
      );
    }

    if (input.notes?.trim()) {
      await this.appendTimeline(
        booking.id,
        `BOOKING NOTES · ${input.notes.trim()}`,
      );
    }

    if (input.passengerNotes?.trim()) {
      await this.appendTimeline(
        booking.id,
        `PASSENGER NOTES · ${input.passengerNotes.trim()}`,
      );
    }

    if (booking.quotedPrice != null) {
      await this.appendTimeline(
        booking.id,
        this.timelineMessage.pricingCaptured({
          pricingMode: booking.pricingMode ?? 'N/A',
          quotedPrice: booking.quotedPrice,
          distanceMiles: booking.distanceMiles ?? null,
          durationMinutes: booking.durationMinutes ?? null,
        }),
      );
    }

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingCreated(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    if (input.autoDispatch) {
      return this.autoDispatchService.startForBooking(
        refreshed.id,
        refreshed.companyId,
      );
    }

    return refreshed;
  }

  async updateBooking(input: UpdateBookingInput) {
    const booking = await this.mustFindBooking(input.bookingId, input.companyId);

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status)) {
      throw new BadRequestException(
        'Cannot edit a completed, cancelled or no-show booking',
      );
    }

    if (booking.status === 'OFFERED') {
      await this.autoDispatchService.cancelActiveOffer(booking.id);
    }

    const updateData: Record<string, unknown> = {};
    const changes: string[] = [];

    if (input.pickup !== undefined) {
      const value = input.pickup.trim();

      if (!value) throw new BadRequestException('Pickup is required');

      if (value !== booking.pickup) {
        updateData.pickup = value;
        changes.push(`pickup changed from "${booking.pickup}" to "${value}"`);
      }
    }

    if (input.dropoff !== undefined) {
      const value = input.dropoff.trim();

      if (!value) throw new BadRequestException('Dropoff is required');

      if (value !== booking.dropoff) {
        updateData.dropoff = value;
        changes.push(`dropoff changed from "${booking.dropoff}" to "${value}"`);
      }
    }

    if (input.pickupTime !== undefined) {
      if (!input.pickupTime?.trim()) {
        throw new BadRequestException('Pickup time is required');
      }

      const pickupTime = new Date(input.pickupTime);

      if (Number.isNaN(pickupTime.getTime())) {
        throw new BadRequestException('Pickup time is invalid');
      }

      if (pickupTime.getTime() !== booking.pickupTime.getTime()) {
        updateData.pickupTime = pickupTime;
        changes.push(
          `pickup time changed from ${booking.pickupTime.toLocaleString(
            'en-GB',
          )} to ${pickupTime.toLocaleString('en-GB')}`,
        );
      }
    }

    const stringFields: Array<{
      key:
        | 'customerName'
        | 'customerPhone'
        | 'bookerName'
        | 'bookerPhone'
        | 'bookerEmail'
        | 'passengerName'
        | 'passengerPhone'
        | 'passengerNotes'
        | 'notes'
        | 'pricingMode';
      label: string;
    }> = [
      { key: 'customerName', label: 'customer name' },
      { key: 'customerPhone', label: 'customer phone' },
      { key: 'bookerName', label: 'booker name' },
      { key: 'bookerPhone', label: 'booker phone' },
      { key: 'bookerEmail', label: 'booker email' },
      { key: 'passengerName', label: 'passenger name' },
      { key: 'passengerPhone', label: 'passenger phone' },
      { key: 'passengerNotes', label: 'passenger notes' },
      { key: 'notes', label: 'booking notes' },
      { key: 'pricingMode', label: 'pricing mode' },
    ];

    for (const field of stringFields) {
      const incoming = input[field.key];

      if (incoming === undefined) continue;

      const value = incoming?.trim() || null;
      const current = booking[field.key] ?? null;

      if (value !== current) {
        updateData[field.key] = value;
        changes.push(
          `${field.label} changed from "${current ?? 'blank'}" to "${
            value ?? 'blank'
          }"`,
        );
      }
    }

    if (input.passengerCount !== undefined) {
      const value = input.passengerCount ?? null;
      const current = booking.passengerCount ?? null;

      if (value !== current) {
        updateData.passengerCount = value;
        changes.push(
          `passenger count changed from "${current ?? 'blank'}" to "${
            value ?? 'blank'
          }"`,
        );
      }
    }

    if (input.quotedPrice !== undefined) {
      const value = input.quotedPrice ?? null;
      const current = booking.quotedPrice ?? null;

      if (value !== current) {
        updateData.quotedPrice = value;
        changes.push(
          `quoted price changed from "${current ?? 'blank'}" to "${
            value ?? 'blank'
          }"`,
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return this.findBookingWithRelations(booking.id, booking.companyId);
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: updateData,
    });

    await this.appendTimeline(
      booking.id,
      this.timelineMessage.bookingEdited(changes),
    );

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    return refreshed;
  }

  async assignDriver(input: AssignDriverInput) {
    const booking = await this.mustFindBooking(input.bookingId, input.companyId);
    const driver = await this.mustFindDispatchableDriver(
      input.driverId,
      input.companyId,
    );

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status)) {
      throw new BadRequestException(
        'Cannot assign a driver to a completed, cancelled or no-show booking',
      );
    }

    await this.autoDispatchService.cancelActiveOffer(booking.id);

    const previousDriverId = booking.driverId ?? null;
    const previousDriverName = booking.driver?.name ?? null;

    if (previousDriverId && previousDriverId !== driver.id) {
      await this.releaseDriverIfSafe(previousDriverId);
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        driverId: driver.id,
        status: 'ACCEPTED',
      },
    });

    const updatedDriver = await this.prisma.driver.update({
      where: { id: driver.id },
      data: {
        status: 'BUSY',
      },
    });

    await this.appendTimeline(
      booking.id,
      this.timelineMessage.driverAssigned({
        driverName: driver.name,
        driverId: driver.id,
        previousDriverId,
        previousDriverName,
      }),
    );

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingAssigned(refreshed.companyId, refreshed);
    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);
    this.realtime.driverUpdated(updatedDriver.companyId, updatedDriver);

    return refreshed;
  }

  async reassignDriver(input: ReassignDriverInput) {
    return this.assignDriver(input);
  }

  async unassignDriver(input: UnassignDriverInput) {
    const booking = await this.mustFindBooking(input.bookingId, input.companyId);

    if (!booking.driverId) {
      throw new BadRequestException('Booking has no assigned driver');
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status)) {
      throw new BadRequestException(
        'Cannot unassign a completed, cancelled or no-show booking',
      );
    }

    await this.autoDispatchService.cancelActiveOffer(booking.id);

    const previousDriverId = booking.driverId;
    const previousDriverName = booking.driver?.name ?? null;

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        driverId: null,
        status: 'BOOKED',
      },
    });

    await this.releaseDriverIfSafe(previousDriverId);

    await this.appendTimeline(
      booking.id,
      this.timelineMessage.driverUnassigned({
        driverId: previousDriverId,
        driverName: previousDriverName,
      }),
    );

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingUpdated(refreshed.companyId, refreshed);
    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);

    return refreshed;
  }

  async cancelBooking(input: CancelBookingInput) {
    const booking = await this.mustFindBooking(input.bookingId, input.companyId);

    if (booking.status === 'CANCELLED') {
      return this.findBookingWithRelations(booking.id, booking.companyId);
    }

    await this.autoDispatchService.cancelActiveOffer(booking.id);

    const previousDriverId = booking.driverId ?? null;

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        driverId: null,
      },
    });

    if (previousDriverId) {
      await this.releaseDriverIfSafe(previousDriverId);
    }

    await this.appendTimeline(
      booking.id,
      this.timelineMessage.bookingCancelled(input.reason ?? null),
    );

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    return refreshed;
  }

  async updateStatus(input: UpdateBookingStatusInput) {
    const booking = await this.mustFindBooking(input.bookingId, input.companyId);

    if (!input.status) {
      throw new BadRequestException('Status is required');
    }

    const nextStatus = input.status.toUpperCase();

    if (booking.status === 'CANCELLED' && nextStatus !== 'CANCELLED') {
      throw new BadRequestException('Cannot change status of a cancelled booking');
    }

    if (booking.status === 'COMPLETED' && nextStatus !== 'COMPLETED') {
      throw new BadRequestException('Cannot change status of a completed booking');
    }

    if (nextStatus === 'CANCELLED') {
      return this.cancelBooking({
        bookingId: booking.id,
        companyId: booking.companyId,
        reason: 'Cancelled from status update',
      });
    }

    if (nextStatus === 'NO_SHOW') {
      return this.noShowBooking(booking.id, booking.companyId);
    }

    this.validateStatusTransition(booking.status, nextStatus);

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: nextStatus },
    });

    await this.appendTimeline(
      booking.id,
      this.timelineMessage.statusChanged(booking.status, nextStatus),
    );

    let updatedDriver: any = null;

    if (booking.driverId && nextStatus === 'COMPLETED') {
      updatedDriver = await this.releaseDriverIfSafe(booking.driverId);
    }

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    if (updatedDriver) {
      this.realtime.driverUpdated(updatedDriver.companyId, updatedDriver);
    }

    return refreshed;
  }

  private async noShowBooking(bookingId: string, companyId: string) {
    const booking = await this.mustFindBooking(bookingId, companyId);
    const previousDriverId = booking.driverId ?? null;

    await this.autoDispatchService.cancelActiveOffer(booking.id);

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'NO_SHOW',
        driverId: null,
      },
    });

    let updatedDriver: any = null;

    if (previousDriverId) {
      updatedDriver = await this.releaseDriverIfSafe(previousDriverId);
    }

    await this.appendTimeline(booking.id, 'BOOKING NO SHOW');

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    if (updatedDriver) {
      this.realtime.driverUpdated(updatedDriver.companyId, updatedDriver);
    }

    return refreshed;
  }

  private bookingInclude() {
    return {
      driver: {
        include: {
          vehicle: true,
        },
      },
      company: true,
      account: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
      events: {
        orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
      },
    };
  }

  private shouldLoadSuggestedDrivers(status: string) {
    return ['BOOKED', 'NO_DRIVER', 'OFFERED'].includes(
      (status || '').toUpperCase(),
    );
  }

  private async releaseDriverIfSafe(driverId: string) {
    const activeBooking = await this.prisma.booking.findFirst({
      where: {
        driverId,
        status: {
          in: ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'],
        },
      },
    });

    if (activeBooking) return null;

    return this.prisma.driver.update({
      where: { id: driverId },
      data: { status: 'AVAILABLE' },
    });
  }

  private async mustFindBooking(bookingId: string, companyId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: {
        driver: true,
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  private async mustFindDispatchableDriver(driverId: string, companyId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, companyId },
      include: { documents: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const blockedReasons: string[] = [];

    if (!['ONLINE', 'AVAILABLE', 'ON_DUTY'].includes(driver.status)) {
      blockedReasons.push(`Driver status is ${driver.status}`);
    }

    const activeBooking = await this.prisma.booking.findFirst({
      where: {
        driverId: driver.id,
        status: {
          in: ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'],
        },
      },
      select: {
        id: true,
        reference: true,
        status: true,
      },
    });

    if (activeBooking) {
      blockedReasons.push(
        `Driver already has active job ${activeBooking.reference ?? activeBooking.id} (${activeBooking.status})`,
      );
    }

    if (this.isExpired(driver.badgeExpiry)) {
      blockedReasons.push('Taxi badge has expired');
    }

    if (this.isExpired(driver.dbsExpiry)) {
      blockedReasons.push('DBS has expired');
    }

    if (this.isExpired(driver.licenceExpiry)) {
      blockedReasons.push('Licence has expired');
    }

    for (const document of driver.documents ?? []) {
      if (this.isExpired(document.expiryDate)) {
        blockedReasons.push(`Document expired: ${document.title}`);
      }
    }

    const vehicleDispatch = await this.getVehicleDispatchForDriver(
      driver.id,
      companyId,
    );

    blockedReasons.push(
      ...vehicleDispatch.blockedReasons.map(
        (reason) => `Assigned vehicle: ${reason}`,
      ),
    );

    if (blockedReasons.length > 0) {
      throw new BadRequestException(
        `Driver is not dispatchable: ${blockedReasons.join(' | ')}`,
      );
    }

    return driver;
  }

  private async getVehicleDispatchForDriver(driverId: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { companyId, driverId },
      include: { documents: true },
    });

    if (!vehicle) {
      return {
        assignable: false,
        blockedReasons: ['No vehicle assigned'],
      };
    }

    const blockedReasons: string[] = [];

    if (vehicle.status === 'OFF_ROAD') {
      blockedReasons.push('Vehicle is marked OFF_ROAD');
    }

    if (vehicle.status === 'INACTIVE') {
      blockedReasons.push('Vehicle is marked INACTIVE');
    }

    const coreChecks = [
      { label: 'MOT', expiry: vehicle.motExpiry },
      { label: 'Insurance', expiry: vehicle.insuranceExpiry },
      { label: 'Inspection', expiry: vehicle.inspectionExpiry },
      { label: 'Vehicle licence', expiry: vehicle.vehicleLicenceExpiry },
      { label: 'Tax', expiry: vehicle.taxExpiry },
    ];

    for (const item of coreChecks) {
      if (this.isExpired(item.expiry)) {
        blockedReasons.push(`${item.label} has expired`);
      }
    }

    for (const document of vehicle.documents ?? []) {
      if (this.isExpired(document.expiryDate)) {
        blockedReasons.push(`Document expired: ${document.title}`);
      }
    }

    return {
      assignable: blockedReasons.length === 0,
      blockedReasons,
      vehicle,
    };
  }

  private validateStatusTransition(currentStatus: string, nextStatus: string) {
    const current = (currentStatus || '').toUpperCase();
    const next = (nextStatus || '').toUpperCase();

    if (current === next) return;

    const allowed: Record<string, string[]> = {
      BOOKED: ['OFFERED', 'ACCEPTED', 'CANCELLED', 'NO_DRIVER'],
      NO_DRIVER: ['BOOKED', 'OFFERED', 'ACCEPTED', 'CANCELLED'],
      OFFERED: ['BOOKED', 'ACCEPTED', 'CANCELLED', 'NO_DRIVER'],
      ACCEPTED: ['EN_ROUTE', 'ARRIVED', 'CANCELLED', 'NO_SHOW'],
      EN_ROUTE: ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
      ARRIVED: ['ON_JOB', 'CANCELLED', 'NO_SHOW'],
      ON_JOB: ['COMPLETED'],
    };

    const allowedNext = allowed[current] ?? [];

    if (!allowedNext.includes(next)) {
      throw new BadRequestException(
        `Invalid booking status change: ${current} -> ${next}`,
      );
    }
  }

  private isExpired(value?: Date | null) {
    if (!value) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
    );

    return target.getTime() < today.getTime();
  }

  private async appendTimeline(bookingId: string, message: string) {
    await this.prisma.bookingEvent.create({
      data: {
        bookingId,
        message,
      },
    });
  }

  private async findBookingWithRelations(bookingId: string, companyId: string) {
    return this.prisma.booking.findFirstOrThrow({
      where: { id: bookingId, companyId },
      include: this.bookingInclude(),
    });
  }

  private generateBookingReference() {
    const random = Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    return `CAB-${y}${m}${d}-${random}`;
  }

  private readonly timelineMessage = {
    bookingCreated: (data: {
      reference: string;
      pickup: string;
      dropoff: string;
      pickupTime: Date;
    }) =>
      `BOOKING CREATED · ${data.reference} · ${data.pickup} → ${data.dropoff} · ${new Date(
        data.pickupTime,
      ).toLocaleString('en-GB')}`,

    customerCaptured: (data: {
      customerName: string | null;
      customerPhone: string | null;
      passengerCount: number | null;
    }) =>
      `CUSTOMER CAPTURED${data.customerName ? ` · ${data.customerName}` : ''}${
        data.customerPhone ? ` · ${data.customerPhone}` : ''
      }${
        data.passengerCount != null
          ? ` · ${data.passengerCount} passenger(s)`
          : ''
      }`,

    passengerCaptured: (data: {
      isThirdPartyBooking: boolean;
      passengerName: string | null;
      passengerPhone: string | null;
    }) =>
      `PASSENGER CAPTURED${
        data.isThirdPartyBooking ? ' · THIRD PARTY BOOKING' : ''
      }${data.passengerName ? ` · ${data.passengerName}` : ''}${
        data.passengerPhone ? ` · ${data.passengerPhone}` : ''
      }`,

    pricingCaptured: (data: {
      pricingMode: string;
      quotedPrice: number;
      distanceMiles: number | null;
      durationMinutes: number | null;
    }) =>
      `PRICING CAPTURED · ${data.pricingMode} · £${data.quotedPrice.toFixed(
        2,
      )}${
        data.distanceMiles != null
          ? ` · ${data.distanceMiles.toFixed(2)} mi`
          : ''
      }${
        data.durationMinutes != null ? ` · ${data.durationMinutes} mins` : ''
      }`,

    driverAssigned: (data: {
      driverName: string;
      driverId: string;
      previousDriverId: string | null;
      previousDriverName: string | null;
    }) =>
      data.previousDriverId
        ? `DRIVER ASSIGNED · ${data.driverName} [${data.driverId}] · replaced ${
            data.previousDriverName ?? 'previous driver'
          } [${data.previousDriverId}]`
        : `DRIVER ASSIGNED · ${data.driverName} [${data.driverId}]`,

    driverUnassigned: (data: {
      driverId: string;
      driverName: string | null;
    }) =>
      `DRIVER UNASSIGNED · ${data.driverName ?? 'Driver'} [${data.driverId}]`,

    bookingCancelled: (reason: string | null) =>
      reason?.trim()
        ? `BOOKING CANCELLED · ${reason.trim()}`
        : 'BOOKING CANCELLED',

    statusChanged: (fromStatus: string, toStatus: string) =>
      `STATUS CHANGED · ${fromStatus} → ${toStatus}`,

    bookingEdited: (changes: string[]) =>
      `BOOKING EDITED · ${changes.join(' · ')}`,
  };
}