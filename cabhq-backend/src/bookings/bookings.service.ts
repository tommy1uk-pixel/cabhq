import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AutoDispatchService } from '../dispatch/auto-dispatch.service';

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
};

type AssignDriverInput = {
  bookingId: string;
  companyId: string;
  driverId: string;
};

type ReassignDriverInput = {
  bookingId: string;
  companyId: string;
  driverId: string;
};

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
  ) {}

  async list(companyId: string) {
    return this.prisma.booking.findMany({
      where: { companyId },
      include: {
        driver: true,
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
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: [{ pickupTime: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async dispatchBoard(companyId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { companyId },
      include: {
        driver: true,
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
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: [{ pickupTime: 'asc' }, { createdAt: 'desc' }],
    });

    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        const suggestedDrivers =
          await this.autoDispatchService.getSuggestedDriversForBooking(
            booking.id,
            booking.companyId,
            3,
          );

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

    return enriched;
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
        throw new BadRequestException('Cannot create booking for a closed account');
      }

      accountId = account.id;
      accountName = account.name;
    }

    const reference = this.generateBookingReference();

    const booking = await this.prisma.booking.create({
      data: {
        companyId: input.companyId,
        accountId,
        reference,
        pickup: input.pickup.trim(),
        dropoff: input.dropoff.trim(),
        pickupLat: input.pickupLat ?? null,
        pickupLng: input.pickupLng ?? null,
        dropoffLat: input.dropoffLat ?? null,
        dropoffLng: input.dropoffLng ?? null,
        pickupTime,
        status: 'BOOKED',
        pricingMode: input.pricingMode ?? null,
        quotedPrice: input.quotedPrice ?? null,
        calculatedFare: input.calculatedFare ?? null,
        distanceMiles: input.distanceMiles ?? null,
        durationMinutes: input.durationMinutes ?? null,
        customerName: input.customerName?.trim() || null,
        customerPhone: input.customerPhone?.trim() || null,
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

    if (
      input.customerName?.trim() ||
      input.customerPhone?.trim() ||
      input.passengerCount != null
    ) {
      await this.appendTimeline(
        booking.id,
        this.timelineMessage.customerCaptured({
          customerName: input.customerName?.trim() || null,
          customerPhone: input.customerPhone?.trim() || null,
          passengerCount: input.passengerCount ?? null,
        }),
      );
    }

    if (input.notes?.trim()) {
      await this.appendTimeline(
        booking.id,
        `BOOKING NOTES · ${input.notes.trim()}`,
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

  async assignDriver(input: AssignDriverInput) {
    const booking = await this.mustFindBooking(input.bookingId, input.companyId);
    const driver = await this.mustFindDispatchableDriver(
      input.driverId,
      input.companyId,
    );

    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      throw new BadRequestException(
        'Cannot assign a driver to a completed or cancelled booking',
      );
    }

    await this.autoDispatchService.cancelActiveOffer(booking.id);

    const previousDriverId = booking.driverId ?? null;
    const previousDriverName = booking.driver?.name ?? null;

    if (booking.driverId && booking.driverId !== driver.id) {
      await this.releaseDriverIfSafe(booking.driverId);
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        driverId: driver.id,
        status: 'ACCEPTED',
      },
    });

    await this.prisma.driver.update({
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
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    return refreshed;
  }

  async reassignDriver(input: ReassignDriverInput) {
    const booking = await this.mustFindBooking(input.bookingId, input.companyId);
    const newDriver = await this.mustFindDispatchableDriver(
      input.driverId,
      input.companyId,
    );
    const previousDriverId = booking.driverId ?? null;
    const previousDriverName = booking.driver?.name ?? null;

    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      throw new BadRequestException(
        'Cannot reassign a completed or cancelled booking',
      );
    }

    if (previousDriverId === newDriver.id) {
      throw new BadRequestException('Booking is already assigned to this driver');
    }

    await this.autoDispatchService.cancelActiveOffer(booking.id);

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        driverId: newDriver.id,
        status: 'ACCEPTED',
      },
    });

    await this.prisma.driver.update({
      where: { id: newDriver.id },
      data: {
        status: 'BUSY',
      },
    });

    if (previousDriverId) {
      await this.releaseDriverIfSafe(previousDriverId);
    }

    await this.appendTimeline(
      booking.id,
      this.timelineMessage.driverReassigned({
        fromDriverId: previousDriverId,
        fromDriverName: previousDriverName,
        toDriverId: newDriver.id,
        toDriverName: newDriver.name,
      }),
    );

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingAssigned(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    return refreshed;
  }

  async unassignDriver(input: UnassignDriverInput) {
    const booking = await this.mustFindBooking(input.bookingId, input.companyId);

    if (!booking.driverId) {
      throw new BadRequestException('Booking has no assigned driver');
    }

    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      throw new BadRequestException(
        'Cannot unassign a completed or cancelled booking',
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

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        driverId: null,
      },
    });

    if (booking.driverId) {
      await this.releaseDriverIfSafe(booking.driverId);
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

    if (booking.status === 'CANCELLED' && input.status !== 'CANCELLED') {
      throw new BadRequestException('Cannot change status of a cancelled booking');
    }

    if (booking.status === 'COMPLETED' && input.status !== 'COMPLETED') {
      throw new BadRequestException('Cannot change status of a completed booking');
    }

    if (input.status === 'CANCELLED') {
      return this.cancelBooking({
        bookingId: booking.id,
        companyId: booking.companyId,
        reason: 'Cancelled from status update',
      });
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: input.status,
      },
    });

    await this.appendTimeline(
      booking.id,
      this.timelineMessage.statusChanged(booking.status, input.status),
    );

    if (booking.driverId && input.status === 'COMPLETED') {
      await this.releaseDriverIfSafe(booking.driverId);
    }

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    return refreshed;
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

    if (activeBooking) {
      return;
    }

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        status: 'AVAILABLE',
      },
    });
  }

  private async mustFindBooking(bookingId: string, companyId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId,
      },
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

  private async getVehicleDispatchForDriver(driverId: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        companyId,
        driverId,
      },
      include: {
        documents: true,
      },
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

  private async mustFindDispatchableDriver(driverId: string, companyId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: {
        id: driverId,
        companyId,
      },
      include: {
        documents: true,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const blockedReasons: string[] = [];

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
      where: {
        id: bookingId,
        companyId,
      },
      include: {
        driver: true,
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
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
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
      `BOOKING CREATED · ${data.reference} · ${data.pickup} → ${data.dropoff} · ${new Date(data.pickupTime).toLocaleString('en-GB')}`,

    customerCaptured: (data: {
      customerName: string | null;
      customerPhone: string | null;
      passengerCount: number | null;
    }) =>
      `CUSTOMER CAPTURED${
        data.customerName ? ` · ${data.customerName}` : ''
      }${data.customerPhone ? ` · ${data.customerPhone}` : ''}${
        data.passengerCount != null ? ` · ${data.passengerCount} passenger(s)` : ''
      }`,

    pricingCaptured: (data: {
      pricingMode: string;
      quotedPrice: number;
      distanceMiles: number | null;
      durationMinutes: number | null;
    }) =>
      `PRICING CAPTURED · ${data.pricingMode} · £${data.quotedPrice.toFixed(2)}${
        data.distanceMiles != null ? ` · ${data.distanceMiles.toFixed(2)} mi` : ''
      }${data.durationMinutes != null ? ` · ${data.durationMinutes} mins` : ''}`,

    driverAssigned: (data: {
      driverName: string;
      driverId: string;
      previousDriverId: string | null;
      previousDriverName: string | null;
    }) =>
      data.previousDriverId
        ? `DRIVER ASSIGNED · ${data.driverName} [${data.driverId}] · replaced ${data.previousDriverName ?? 'previous driver'} [${data.previousDriverId}]`
        : `DRIVER ASSIGNED · ${data.driverName} [${data.driverId}]`,

    driverReassigned: (data: {
      fromDriverId: string | null;
      fromDriverName: string | null;
      toDriverId: string;
      toDriverName: string;
    }) =>
      `DRIVER REASSIGNED · ${data.fromDriverName ?? 'Unassigned'} [${data.fromDriverId ?? 'N/A'}] → ${data.toDriverName} [${data.toDriverId}]`,

    driverUnassigned: (data: {
      driverId: string;
      driverName: string | null;
    }) => `DRIVER UNASSIGNED · ${data.driverName ?? 'Driver'} [${data.driverId}]`,

    bookingCancelled: (reason: string | null) =>
      reason?.trim()
        ? `BOOKING CANCELLED · ${reason.trim()}`
        : 'BOOKING CANCELLED',

    statusChanged: (fromStatus: string, toStatus: string) =>
      `STATUS CHANGED · ${fromStatus} → ${toStatus}`,
  };
}