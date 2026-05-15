import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

type EligibleDriver = {
  id: string;
  name: string;
  phone?: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  lastLocationAt: Date | null;
  companyId: string;
  distanceMiles: number;
  score: number;
  scoreBreakdown: string[];
  vehicle?: {
    id: string;
    registration?: string | null;
    reg?: string | null;
    make?: string | null;
    model?: string | null;
  } | null;
};

type DispatchCheck = {
  assignable: boolean;
  blockedReasons: string[];
};

@Injectable()
export class AutoDispatchService {
  private readonly logger = new Logger(AutoDispatchService.name);
  private readonly offerTimeoutMs = 20_000;
  private readonly maxOfferRounds = 25;
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async startForBooking(bookingId: string, companyId: string) {
    this.clearOfferTimer(bookingId);

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: {
        driver: true,
        company: true,
        events: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status)) {
      return this.findBookingWithRelations(booking.id, booking.companyId);
    }

    if (!['BOOKED', 'NO_DRIVER', 'OFFERED'].includes(booking.status)) {
      throw new BadRequestException(
        'Auto dispatch can only run on BOOKED, OFFERED or NO_DRIVER bookings',
      );
    }

    const currentDriverId = booking.driverId ?? null;

    if (currentDriverId) {
      await this.clearBookingDriverAndRelease({
        bookingId: booking.id,
        companyId: booking.companyId,
        driverId: currentDriverId,
        nextBookingStatus: 'BOOKED',
      });
    }

    this.realtime.autoDispatchStarted?.(booking.companyId, {
      bookingId: booking.id,
    });

    const refreshedEvents = await this.prisma.bookingEvent.findMany({
      where: { bookingId: booking.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const offeredDriverIds = this.extractOfferedDriverIds(refreshedEvents ?? []);

    if (offeredDriverIds.length >= this.maxOfferRounds) {
      return this.markNoDriver(
        booking.id,
        booking.companyId,
        `Auto dispatch stopped after ${this.maxOfferRounds} offers`,
      );
    }

    const rankedDrivers = await this.findRankedEligibleDrivers(
      booking.companyId,
      booking.pickupLat ?? null,
      booking.pickupLng ?? null,
      offeredDriverIds,
    );

    const nextDriver = rankedDrivers[0] ?? null;

    if (!nextDriver) {
      return this.markNoDriver(
        booking.id,
        booking.companyId,
        'No eligible drivers available',
      );
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'OFFERED',
        driverId: nextDriver.id,
      },
    });

    const offeredDriver = await this.prisma.driver.update({
      where: { id: nextDriver.id },
      data: {
        status: 'OFFERED',
      },
    });

    await this.appendTimeline(
      booking.id,
      `AUTO DISPATCH OFFERED · ${nextDriver.name} [${nextDriver.id}] · score ${
        nextDriver.score
      }${
        nextDriver.distanceMiles === Number.MAX_SAFE_INTEGER
          ? ' · distance unknown'
          : ` · ${nextDriver.distanceMiles.toFixed(2)} miles away`
      } · ${
        nextDriver.scoreBreakdown.length > 0
          ? nextDriver.scoreBreakdown.join(' | ')
          : 'Auto scoring applied'
      }`,
    );

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingOfferCreated(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);
    this.realtime.driverUpdated(offeredDriver.companyId, offeredDriver);

    this.startOfferTimer(refreshed.id, refreshed.companyId, nextDriver.id);

    return refreshed;
  }

  async acceptOffer(bookingId: string, companyId: string, driverId: string) {
    this.clearOfferTimer(bookingId);

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: { driver: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'OFFERED') {
      throw new BadRequestException('Booking is not currently offered');
    }

    if (!booking.driverId || booking.driverId !== driverId) {
      throw new BadRequestException('Offer is not assigned to this driver');
    }

    const dispatch = await this.isDriverDispatchable(driverId, companyId, {
      allowCurrentOfferedBookingId: booking.id,
    });

    if (!dispatch.assignable) {
      await this.appendTimeline(
        booking.id,
        `OFFER ACCEPT FAILED · driver no longer dispatchable · ${dispatch.blockedReasons.join(
          ' | ',
        )}`,
      );

      throw new BadRequestException(
        `Driver no longer dispatchable: ${dispatch.blockedReasons.join(' | ')}`,
      );
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'ACCEPTED',
      },
    });

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        status: 'BUSY',
      },
    });

    await this.appendTimeline(
      booking.id,
      `OFFER ACCEPTED · ${driver.name} [${driver.id}]`,
    );

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingOfferAccepted?.(refreshed.companyId, refreshed);
    this.realtime.bookingAssigned(refreshed.companyId, refreshed);
    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);
    this.realtime.driverUpdated(driver.companyId, driver);

    this.realtime.autoDispatchCompleted?.(refreshed.companyId, {
      bookingId: refreshed.id,
      driverId: driver.id,
    });

    return refreshed;
  }

  async rejectOffer(bookingId: string, companyId: string, driverId: string) {
    this.clearOfferTimer(bookingId);

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: { driver: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'OFFERED') {
      throw new BadRequestException('Booking is not currently offered');
    }

    if (!booking.driverId || booking.driverId !== driverId) {
      throw new BadRequestException('Offer is not assigned to this driver');
    }

    await this.appendTimeline(
      booking.id,
      `OFFER REJECTED · ${booking.driver?.name ?? 'Driver'} [${driverId}]`,
    );

    await this.clearBookingDriverAndRelease({
      bookingId: booking.id,
      companyId: booking.companyId,
      driverId,
      nextBookingStatus: 'BOOKED',
    });

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingOfferRejected?.(refreshed.companyId, refreshed);
    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    return this.startForBooking(booking.id, booking.companyId);
  }

  async cancelActiveOffer(bookingId: string) {
    this.clearOfferTimer(bookingId);

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return;
    if (booking.status !== 'OFFERED') return;

    const currentDriverId = booking.driverId ?? null;

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'BOOKED',
        driverId: null,
      },
    });

    await this.appendTimeline(
      booking.id,
      'OFFER CANCELLED · dispatcher override',
    );

    if (currentDriverId) {
      await this.releaseDriverIfSafe(currentDriverId);
    }

    const refreshed = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);
  }

  async getSuggestedDriversForBooking(
    bookingId: string,
    companyId: string,
    limit = 3,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: {
        events: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const offeredDriverIds = this.extractOfferedDriverIds(booking.events ?? []);

    const rankedDrivers = await this.findRankedEligibleDrivers(
      booking.companyId,
      booking.pickupLat ?? null,
      booking.pickupLng ?? null,
      offeredDriverIds,
    );

    return rankedDrivers.slice(0, limit).map((driver) => ({
      id: driver.id,
      name: driver.name,
      status: driver.status,
      distanceMiles:
        driver.distanceMiles === Number.MAX_SAFE_INTEGER
          ? null
          : driver.distanceMiles,
      score: driver.score,
      scoreBreakdown: driver.scoreBreakdown,
      lastLocationAt: driver.lastLocationAt,
      vehicle: driver.vehicle ?? null,
    }));
  }

  private startOfferTimer(
    bookingId: string,
    companyId: string,
    driverId: string,
  ) {
    this.clearOfferTimer(bookingId);

    const timer = setTimeout(async () => {
      try {
        const booking = await this.prisma.booking.findFirst({
          where: { id: bookingId, companyId },
          include: { driver: true },
        });

        if (!booking) return;
        if (booking.status !== 'OFFERED') return;
        if (booking.driverId !== driverId) return;

        await this.appendTimeline(
          booking.id,
          `OFFER EXPIRED · ${
            booking.driver?.name ?? 'Driver'
          } [${driverId}]`,
        );

        await this.clearBookingDriverAndRelease({
          bookingId: booking.id,
          companyId: booking.companyId,
          driverId,
          nextBookingStatus: 'BOOKED',
        });

        const refreshed = await this.findBookingWithRelations(
          booking.id,
          booking.companyId,
        );

        this.realtime.bookingOfferExpired?.(refreshed.companyId, refreshed);
        this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
        this.realtime.bookingUpdated(refreshed.companyId, refreshed);

        await this.startForBooking(booking.id, booking.companyId);
      } catch (error) {
        this.logger.error(
          `Offer timer failed for booking ${bookingId}`,
          error instanceof Error ? error.stack : String(error),
        );
      } finally {
        this.clearOfferTimer(bookingId);
      }
    }, this.offerTimeoutMs);

    this.timers.set(bookingId, timer);
  }

  private clearOfferTimer(bookingId: string) {
    const existing = this.timers.get(bookingId);

    if (existing) {
      clearTimeout(existing);
      this.timers.delete(bookingId);
    }
  }

  private extractOfferedDriverIds(events: Array<{ message: string }>) {
    const ids = new Set<string>();

    for (const event of events) {
      const matches = event.message.match(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      );

      if (!matches?.length) continue;

      for (const match of matches) {
        ids.add(match);
      }
    }

    return Array.from(ids);
  }

  private async isDriverDispatchable(
    driverId: string,
    companyId: string,
    options?: {
      allowCurrentOfferedBookingId?: string;
    },
  ): Promise<DispatchCheck> {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, companyId },
      include: { documents: true },
    });

    if (!driver) {
      return {
        assignable: false,
        blockedReasons: ['Driver not found'],
      };
    }

    const blockedReasons: string[] = [];

    if (!['AVAILABLE', 'ONLINE', 'ON_DUTY', 'OFFERED'].includes(driver.status)) {
      blockedReasons.push(`Driver status is ${driver.status}`);
    }

    const activeBooking = await this.prisma.booking.findFirst({
      where: {
        companyId,
        driverId: driver.id,
        status: {
          in: ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'],
        },
        NOT: options?.allowCurrentOfferedBookingId
          ? {
              id: options.allowCurrentOfferedBookingId,
            }
          : undefined,
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
      blockedReasons.push('Taxi badge expired');
    }

    if (this.isExpired(driver.dbsExpiry)) {
      blockedReasons.push('DBS expired');
    }

    if (this.isExpired(driver.licenceExpiry)) {
      blockedReasons.push('Licence expired');
    }

    for (const document of driver.documents ?? []) {
      if (this.isExpired(document.expiryDate)) {
        blockedReasons.push(`Document expired: ${document.title}`);
      }
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        companyId,
        driverId: driver.id,
      },
      include: {
        documents: true,
      },
    });

    if (!vehicle) {
      blockedReasons.push('No vehicle assigned');
    } else {
      if (vehicle.status === 'OFF_ROAD') {
        blockedReasons.push('Vehicle is marked OFF_ROAD');
      }

      if (vehicle.status === 'INACTIVE') {
        blockedReasons.push('Vehicle is marked INACTIVE');
      }

      const vehicleCoreChecks = [
        { label: 'MOT', expiry: vehicle.motExpiry },
        { label: 'Insurance', expiry: vehicle.insuranceExpiry },
        { label: 'Inspection', expiry: vehicle.inspectionExpiry },
        { label: 'Vehicle licence', expiry: vehicle.vehicleLicenceExpiry },
        { label: 'Tax', expiry: vehicle.taxExpiry },
      ];

      for (const item of vehicleCoreChecks) {
        if (this.isExpired(item.expiry)) {
          blockedReasons.push(`${item.label} has expired`);
        }
      }

      for (const document of vehicle.documents ?? []) {
        if (this.isExpired(document.expiryDate)) {
          blockedReasons.push(`Vehicle document expired: ${document.title}`);
        }
      }
    }

    return {
      assignable: blockedReasons.length === 0,
      blockedReasons,
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

  private async findRankedEligibleDrivers(
    companyId: string,
    pickupLat: number | null,
    pickupLng: number | null,
    excludeDriverIds: string[],
  ): Promise<EligibleDriver[]> {
    const drivers = await this.prisma.driver.findMany({
      where: { companyId },
      include: { documents: true },
      orderBy: [{ lastLocationAt: 'desc' }, { createdAt: 'asc' }],
    });

    const eligible: EligibleDriver[] = [];

    for (const driver of drivers) {
      if (excludeDriverIds.includes(driver.id)) {
        continue;
      }

      if (!['AVAILABLE', 'ONLINE', 'ON_DUTY'].includes(driver.status)) {
        continue;
      }

      const dispatch = await this.isDriverDispatchable(driver.id, companyId);

      if (!dispatch.assignable) {
        continue;
      }

      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          companyId,
          driverId: driver.id,
        },
      });

      const distanceMiles =
        pickupLat != null &&
        pickupLng != null &&
        driver.latitude != null &&
        driver.longitude != null
          ? this.haversineMiles(
              pickupLat,
              pickupLng,
              driver.latitude,
              driver.longitude,
            )
          : Number.MAX_SAFE_INTEGER;

      const { score, scoreBreakdown } = this.calculateDriverScore({
        status: driver.status,
        distanceMiles,
        lastLocationAt: driver.lastLocationAt,
        hasCoordinates: driver.latitude != null && driver.longitude != null,
      });

      eligible.push({
        ...driver,
        distanceMiles,
        score,
        scoreBreakdown,
        vehicle: vehicle
          ? {
              id: vehicle.id,
              registration: vehicle.reg ?? null,
              reg: vehicle.reg ?? null,
              make: vehicle.make ?? null,
              model: vehicle.model ?? null,
            }
          : null,
      });
    }

    eligible.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      if (a.distanceMiles !== b.distanceMiles) {
        return a.distanceMiles - b.distanceMiles;
      }

      const aLast = a.lastLocationAt ? new Date(a.lastLocationAt).getTime() : 0;
      const bLast = b.lastLocationAt ? new Date(b.lastLocationAt).getTime() : 0;

      return bLast - aLast;
    });

    return eligible;
  }

  private calculateDriverScore(input: {
    status: string;
    distanceMiles: number;
    lastLocationAt: Date | null;
    hasCoordinates: boolean;
  }) {
    let score = 0;
    const scoreBreakdown: string[] = [];

    if (input.status === 'AVAILABLE') {
      score += 60;
      scoreBreakdown.push('+60 AVAILABLE');
    } else if (input.status === 'ON_DUTY') {
      score += 50;
      scoreBreakdown.push('+50 ON_DUTY');
    } else if (input.status === 'ONLINE') {
      score += 45;
      scoreBreakdown.push('+45 ONLINE');
    }

    if (input.hasCoordinates) {
      score += 25;
      scoreBreakdown.push('+25 GPS_PRESENT');
    } else {
      score -= 50;
      scoreBreakdown.push('-50 NO_GPS');
    }

    const minutesSinceGps = this.getMinutesSince(input.lastLocationAt);

    if (minutesSinceGps <= 2) {
      score += 30;
      scoreBreakdown.push('+30 GPS_<=2M');
    } else if (minutesSinceGps <= 5) {
      score += 20;
      scoreBreakdown.push('+20 GPS_<=5M');
    } else if (minutesSinceGps <= 15) {
      score += 5;
      scoreBreakdown.push('+5 GPS_<=15M');
    } else {
      score -= 30;
      scoreBreakdown.push('-30 STALE_GPS');
    }

    if (input.distanceMiles !== Number.MAX_SAFE_INTEGER) {
      if (input.distanceMiles <= 1) {
        score += 45;
        scoreBreakdown.push('+45 DIST_<=1MI');
      } else if (input.distanceMiles <= 3) {
        score += 35;
        scoreBreakdown.push('+35 DIST_<=3MI');
      } else if (input.distanceMiles <= 5) {
        score += 20;
        scoreBreakdown.push('+20 DIST_<=5MI');
      } else if (input.distanceMiles <= 10) {
        score += 5;
        scoreBreakdown.push('+5 DIST_<=10MI');
      } else {
        const penalty = Math.min(45, Math.round(input.distanceMiles));
        score -= penalty;
        scoreBreakdown.push(`-${penalty} DIST_FAR`);
      }
    } else {
      score -= 20;
      scoreBreakdown.push('-20 DIST_UNKNOWN');
    }

    return {
      score,
      scoreBreakdown,
    };
  }

  private getMinutesSince(value: Date | null) {
    if (!value) return Number.MAX_SAFE_INTEGER;

    const diffMs = Date.now() - new Date(value).getTime();

    return diffMs / 1000 / 60;
  }

  private async markNoDriver(
    bookingId: string,
    companyId: string,
    reason: string,
  ) {
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'NO_DRIVER',
        driverId: null,
      },
    });

    await this.appendTimeline(
      bookingId,
      `AUTO DISPATCH FAILED · ${reason}`,
    );

    const refreshed = await this.findBookingWithRelations(bookingId, companyId);

    this.realtime.bookingNoDriver?.(refreshed.companyId, {
      bookingId: refreshed.id,
      reason,
    });

    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    return refreshed;
  }

  private async clearBookingDriverAndRelease(input: {
    bookingId: string;
    companyId: string;
    driverId: string;
    nextBookingStatus: string;
  }) {
    await this.prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        status: input.nextBookingStatus,
        driverId: null,
      },
    });

    await this.releaseDriverIfSafe(input.driverId);
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
      include: {
        driver: true,
        company: true,
        events: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });
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

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        status: 'AVAILABLE',
      },
    });

    this.realtime.driverUpdated(driver.companyId, driver);
  }

  private haversineMiles(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusMiles = 3958.8;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMiles * c;
  }
}
