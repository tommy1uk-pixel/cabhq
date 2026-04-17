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
};

@Injectable()
export class AutoDispatchService {
  private readonly logger = new Logger(AutoDispatchService.name);
  private readonly offerTimeoutMs = 20_000;
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async startForBooking(bookingId: string, companyId: string) {
    this.clearOfferTimer(bookingId);

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId,
      },
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

    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
      return this.findBookingWithRelations(booking.id, booking.companyId);
    }

    if (booking.driverId) {
      await this.releaseDriverIfSafe(booking.driverId);
    }

    if (!['NO_DRIVER', 'BOOKED', 'OFFERED'].includes(booking.status)) {
      throw new BadRequestException(
        'Auto-dispatch can only run on BOOKED, OFFERED or NO_DRIVER bookings',
      );
    }

    const offeredDriverIds = this.extractOfferedDriverIds(booking.events ?? []);

    const nextDriver = await this.findNearestEligibleDriver(
      booking.companyId,
      booking.pickupLat ?? null,
      booking.pickupLng ?? null,
      offeredDriverIds,
    );

    if (!nextDriver) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'NO_DRIVER',
          driverId: null,
        },
      });

      await this.appendTimeline(
        booking.id,
        'AUTO DISPATCH FAILED · no eligible drivers available',
      );

      const refreshed = await this.findBookingWithRelations(
        booking.id,
        booking.companyId,
      );

      this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
      this.realtime.bookingUpdated(refreshed.companyId, refreshed);

      return refreshed;
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'OFFERED',
        driverId: nextDriver.id,
      },
    });

    await this.appendTimeline(
      booking.id,
      `AUTO DISPATCH OFFERED · ${nextDriver.name} [${nextDriver.id}]${
        nextDriver.distanceMiles === Number.MAX_SAFE_INTEGER
          ? ' · distance unknown'
          : ` · ${nextDriver.distanceMiles.toFixed(2)} miles away`
      }`,
    );

    const updated = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingOfferCreated(updated.companyId, updated);
    this.realtime.bookingUpdated(updated.companyId, updated);

    this.startOfferTimer(updated.id, updated.companyId, nextDriver.id);

    return updated;
  }

  async acceptOffer(bookingId: string, companyId: string, driverId: string) {
    this.clearOfferTimer(bookingId);

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId,
      },
      include: {
        driver: true,
      },
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

    const driverDispatch = await this.isDriverDispatchable(driverId, companyId);
    if (!driverDispatch.assignable) {
      throw new BadRequestException(
        `Driver is no longer dispatchable: ${driverDispatch.blockedReasons.join(' | ')}`,
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

    const updated = await this.findBookingWithRelations(
      booking.id,
      booking.companyId,
    );

    this.realtime.bookingAssigned(updated.companyId, updated);
    this.realtime.bookingStatusChanged(updated.companyId, updated);
    this.realtime.driverUpdated(driver.companyId, driver);

    return updated;
  }

  async rejectOffer(bookingId: string, companyId: string, driverId: string) {
    this.clearOfferTimer(bookingId);

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId,
      },
      include: {
        driver: true,
      },
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

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'BOOKED',
        driverId: null,
      },
    });

    await this.releaseDriverIfSafe(driverId);

    return this.startForBooking(booking.id, booking.companyId);
  }

  async cancelActiveOffer(bookingId: string) {
    this.clearOfferTimer(bookingId);

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return;

    if (booking.status === 'OFFERED') {
      const currentDriverId = booking.driverId ?? null;

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'BOOKED',
          driverId: null,
        },
      });

      await this.appendTimeline(booking.id, 'OFFER CANCELLED · dispatcher override');

      if (currentDriverId) {
        await this.releaseDriverIfSafe(currentDriverId);
      }

      const refreshed = await this.findBookingWithRelations(
        booking.id,
        booking.companyId,
      );

      this.realtime.bookingUpdated(refreshed.companyId, refreshed);
      this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    }
  }

  private startOfferTimer(bookingId: string, companyId: string, driverId: string) {
    this.clearOfferTimer(bookingId);

    const timer = setTimeout(async () => {
      try {
        const booking = await this.prisma.booking.findFirst({
          where: {
            id: bookingId,
            companyId,
          },
          include: {
            driver: true,
          },
        });

        if (!booking) return;
        if (booking.status !== 'OFFERED') return;
        if (booking.driverId !== driverId) return;

        await this.appendTimeline(
          booking.id,
          `OFFER EXPIRED · ${booking.driver?.name ?? 'Driver'} [${driverId}]`,
        );

        await this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: 'BOOKED',
            driverId: null,
          },
        });

        await this.releaseDriverIfSafe(driverId);

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

  private async isDriverDispatchable(driverId: string, companyId: string) {
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
      return {
        assignable: false,
        blockedReasons: ['Driver not found'],
      };
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

  private async findNearestEligibleDriver(
    companyId: string,
    pickupLat: number | null,
    pickupLng: number | null,
    excludeDriverIds: string[],
  ): Promise<EligibleDriver | null> {
    const drivers = await this.prisma.driver.findMany({
      where: {
        companyId,
      },
      include: {
        documents: true,
      },
      orderBy: [{ lastLocationAt: 'desc' }, { createdAt: 'asc' }],
    });

    const eligible: EligibleDriver[] = [];

    for (const driver of drivers) {
      if (excludeDriverIds.includes(driver.id)) {
        continue;
      }

      if (!['AVAILABLE', 'ON_DUTY', 'ONLINE'].includes(driver.status)) {
        continue;
      }

      const dispatch = await this.isDriverDispatchable(driver.id, companyId);
      if (!dispatch.assignable) {
        continue;
      }

      eligible.push({
        ...driver,
        distanceMiles:
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
            : Number.MAX_SAFE_INTEGER,
      });
    }

    if (eligible.length === 0) {
      return null;
    }

    eligible.sort((a, b) => {
      if (a.distanceMiles !== b.distanceMiles) {
        return a.distanceMiles - b.distanceMiles;
      }

      const aLast = a.lastLocationAt ? new Date(a.lastLocationAt).getTime() : 0;
      const bLast = b.lastLocationAt ? new Date(b.lastLocationAt).getTime() : 0;

      return bLast - aLast;
    });

    return eligible[0];
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

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        status: 'AVAILABLE',
      },
    });
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