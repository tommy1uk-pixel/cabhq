import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutoDispatchService } from './auto-dispatch.service';
import { RealtimeService } from '../realtime/realtime.service';

type DriverOfferResponseInput = {
  bookingId: string;
  driverId: string;
  action: 'ACCEPT' | 'REJECT';
};

type UpdateDriverStatusInput = {
  driverId: string;
  status: 'ONLINE' | 'OFF_DUTY' | 'AVAILABLE' | 'BUSY' | 'ON_DUTY';
};

type UpdateDriverLocationInput = {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
};

@Injectable()
export class DriverDispatchService {
  private readonly pickupGeofenceMiles = 0.1;
  private readonly dropoffGeofenceMiles = 0.1;
  private readonly expiryWarningDays = 30;
  private readonly offerTimeoutMs = 20_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly autoDispatchService: AutoDispatchService,
    private readonly realtime: RealtimeService,
  ) {}

  async getDriverProfile(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        id: driverId,
      },
      include: {
        documents: {
          orderBy: [{ createdAt: 'desc' }],
        },
        vehicle: {
          include: {
            documents: {
              orderBy: [{ createdAt: 'desc' }],
            },
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return this.mapDriverProfile(driver);
  }

  async getActiveOffer(driverId: string) {
    await this.ensureDriverExists(driverId);

    const booking = await this.prisma.booking.findFirst({
      where: {
        driverId,
        status: 'OFFERED',
      },
      include: {
        driver: true,
        company: true,
        events: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return {
      offer: booking ? this.mapBookingForDriverApp(booking) : null,
    };
  }

  async getActiveJobs(driverId: string) {
    await this.ensureDriverExists(driverId);

    const jobs = await this.prisma.booking.findMany({
      where: {
        driverId,
        status: {
          in: ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'],
        },
      },
      include: {
        driver: true,
        company: true,
        events: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: [{ pickupTime: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      jobs: jobs.map((job) => this.mapBookingForDriverApp(job)),
    };
  }

  async getJobHistory(driverId: string) {
    await this.ensureDriverExists(driverId);

    const jobs = await this.prisma.booking.findMany({
      where: {
        driverId,
        status: {
          in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
        },
      },
      include: {
        driver: true,
        company: true,
        events: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: [{ pickupTime: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return {
      jobs: jobs.map((job) => this.mapBookingForDriverApp(job)),
    };
  }

  async respond(input: DriverOfferResponseInput) {
    const booking = await this.prisma.booking.findUnique({
      where: {
        id: input.bookingId,
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

    if (booking.status !== 'OFFERED') {
      throw new BadRequestException('This booking is not currently offered');
    }

    if (booking.driverId !== input.driverId) {
      throw new BadRequestException('This offer is not assigned to this driver');
    }

    if (input.action === 'ACCEPT') {
      const updated = await this.autoDispatchService.acceptOffer(
        booking.id,
        booking.companyId,
        input.driverId,
      );

      return {
        success: true,
        action: 'ACCEPT',
        booking: this.mapBookingForDriverApp(updated),
      };
    }

    const updated = await this.autoDispatchService.rejectOffer(
      booking.id,
      booking.companyId,
      input.driverId,
    );

    return {
      success: true,
      action: 'REJECT',
      booking: this.mapBookingForDriverApp(updated),
    };
  }

  async updateDriverStatus(input: UpdateDriverStatusInput) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        id: input.driverId,
      },
      include: {
        documents: {
          orderBy: [{ createdAt: 'desc' }],
        },
        vehicle: {
          include: {
            documents: {
              orderBy: [{ createdAt: 'desc' }],
            },
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const allowedStatuses = ['ONLINE', 'OFF_DUTY', 'AVAILABLE', 'BUSY', 'ON_DUTY'];

    if (!allowedStatuses.includes(input.status)) {
      throw new BadRequestException('Invalid driver status');
    }

    const activeJob = await this.prisma.booking.findFirst({
      where: {
        driverId: driver.id,
        status: {
          in: ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'],
        },
      },
    });

    if (activeJob && ['ONLINE', 'AVAILABLE', 'ON_DUTY', 'OFF_DUTY'].includes(input.status)) {
      throw new BadRequestException(
        'Cannot manually change driver status while they have an active or offered job',
      );
    }

    const updated = await this.prisma.driver.update({
      where: {
        id: driver.id,
      },
      data: {
        status: input.status,
      },
      include: {
        documents: {
          orderBy: [{ createdAt: 'desc' }],
        },
        vehicle: {
          include: {
            documents: {
              orderBy: [{ createdAt: 'desc' }],
            },
          },
        },
      },
    });

    const mapped = this.mapDriverProfile(updated);
    this.realtime.driverUpdated(updated.companyId, mapped);

    return mapped;
  }

  async updateLocation(input: UpdateDriverLocationInput) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        id: input.driverId,
      },
      include: {
        documents: {
          orderBy: [{ createdAt: 'desc' }],
        },
        vehicle: {
          include: {
            documents: {
              orderBy: [{ createdAt: 'desc' }],
            },
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const updated = await this.prisma.driver.update({
      where: {
        id: driver.id,
      },
      data: {
        latitude: input.latitude,
        longitude: input.longitude,
        heading: input.heading ?? null,
        speed: input.speed ?? null,
        lastLocationAt: new Date(),
      },
      include: {
        documents: {
          orderBy: [{ createdAt: 'desc' }],
        },
        vehicle: {
          include: {
            documents: {
              orderBy: [{ createdAt: 'desc' }],
            },
          },
        },
      },
    });

    this.realtime.driverLocation(updated.companyId, {
      driverId: updated.id,
      latitude: updated.latitude ?? input.latitude,
      longitude: updated.longitude ?? input.longitude,
      heading: updated.heading ?? null,
      speed: updated.speed ?? null,
      lastLocationAt:
        updated.lastLocationAt?.toISOString() ?? new Date().toISOString(),
    });

    const mapped = this.mapDriverProfile(updated);
    this.realtime.driverUpdated(updated.companyId, mapped);

    await this.runGeofenceAutomation(updated.id, updated.companyId);

    return {
      success: true,
      driver: mapped,
    };
  }

  async getBookingForDriver(driverId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        driverId,
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
      throw new NotFoundException('Booking not found for this driver');
    }

    return this.mapBookingForDriverApp(booking);
  }

  mapBookingForDriverApp(booking: any) {
    const offerMeta = this.buildOfferMeta(booking);

    return {
      id: booking.id,
      reference: booking.reference,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      pickupLat: booking.pickupLat ?? null,
      pickupLng: booking.pickupLng ?? null,
      dropoffLat: booking.dropoffLat ?? null,
      dropoffLng: booking.dropoffLng ?? null,
      status: booking.status,
      pickupTime: booking.pickupTime
        ? new Date(booking.pickupTime).toISOString()
        : null,
      createdAt: booking.createdAt
        ? new Date(booking.createdAt).toISOString()
        : null,
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
            email: booking.driver.email ?? null,
            status: booking.driver.status,
            latitude: booking.driver.latitude ?? null,
            longitude: booking.driver.longitude ?? null,
            lastLocationAt: booking.driver.lastLocationAt
              ? new Date(booking.driver.lastLocationAt).toISOString()
              : null,
          }
        : null,
      pricing: {
        mode: booking.pricingMode ?? null,
        quotedPrice: booking.quotedPrice ?? null,
        calculatedFare: booking.calculatedFare ?? null,
        distanceMiles: booking.distanceMiles ?? null,
        durationMinutes: booking.durationMinutes ?? null,
      },
      journey: {
        pickup: {
          address: booking.pickup,
          lat: booking.pickupLat ?? null,
          lng: booking.pickupLng ?? null,
        },
        dropoff: {
          address: booking.dropoff,
          lat: booking.dropoffLat ?? null,
          lng: booking.dropoffLng ?? null,
        },
      },
      offer: offerMeta,
      timeline: (booking.events ?? []).map((event: any) => ({
        id: event.id,
        message: event.message,
        createdAt: event.createdAt
          ? new Date(event.createdAt).toISOString()
          : null,
      })),
    };
  }

  private buildOfferMeta(booking: any) {
    if (booking.status !== 'OFFERED') {
      return {
        isActive: false,
        timeoutSeconds: Math.floor(this.offerTimeoutMs / 1000),
        offeredAt: null,
        expiresAt: null,
        secondsRemaining: 0,
        expired: false,
      };
    }

    const events = Array.isArray(booking.events) ? booking.events : [];
    const offeredEvent = [...events]
      .reverse()
      .find((event: any) =>
        typeof event.message === 'string' &&
        event.message.startsWith('AUTO DISPATCH OFFERED'),
      );

    const offeredAtDate = offeredEvent?.createdAt
      ? new Date(offeredEvent.createdAt)
      : booking.updatedAt
        ? new Date(booking.updatedAt)
        : null;

    if (!offeredAtDate || Number.isNaN(offeredAtDate.getTime())) {
      return {
        isActive: true,
        timeoutSeconds: Math.floor(this.offerTimeoutMs / 1000),
        offeredAt: null,
        expiresAt: null,
        secondsRemaining: Math.floor(this.offerTimeoutMs / 1000),
        expired: false,
      };
    }

    const expiresAtDate = new Date(offeredAtDate.getTime() + this.offerTimeoutMs);
    const remainingMs = Math.max(0, expiresAtDate.getTime() - Date.now());
    const secondsRemaining = Math.ceil(remainingMs / 1000);

    return {
      isActive: true,
      timeoutSeconds: Math.floor(this.offerTimeoutMs / 1000),
      offeredAt: offeredAtDate.toISOString(),
      expiresAt: expiresAtDate.toISOString(),
      secondsRemaining,
      expired: secondsRemaining <= 0,
    };
  }

  private async ensureDriverExists(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        id: driverId,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  private getDocumentStatus(expiryDate?: Date | null) {
    if (!expiryDate) {
      return 'NO_EXPIRY';
    }

    const today = new Date();
    const startToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();

    const target = new Date(expiryDate);
    const startTarget = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
    ).getTime();

    const diffDays = Math.round(
      (startTarget - startToday) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      return 'EXPIRED';
    }

    if (diffDays <= this.expiryWarningDays) {
      return 'EXPIRING';
    }

    return 'VALID';
  }

  private mapDriverProfile(driver: any) {
    const badgeStatus = this.getDocumentStatus(driver.badgeExpiry);
    const dbsStatus = this.getDocumentStatus(driver.dbsExpiry);
    const licenceStatus = this.getDocumentStatus(driver.licenceExpiry);

    const expiredCoreItems = [
      badgeStatus === 'EXPIRED' ? 'Taxi badge has expired' : null,
      dbsStatus === 'EXPIRED' ? 'DBS has expired' : null,
      licenceStatus === 'EXPIRED' ? 'Licence has expired' : null,
    ].filter(Boolean) as string[];

    const expiringCoreItems = [
      badgeStatus === 'EXPIRING' ? 'Taxi badge expiring soon' : null,
      dbsStatus === 'EXPIRING' ? 'DBS expiring soon' : null,
      licenceStatus === 'EXPIRING' ? 'Licence expiring soon' : null,
    ].filter(Boolean) as string[];

    const documents = (driver.documents ?? []).map((document: any) => ({
      ...document,
      issueDate: document.issueDate ? document.issueDate.toISOString() : null,
      expiryDate: document.expiryDate ? document.expiryDate.toISOString() : null,
      createdAt: document.createdAt ? document.createdAt.toISOString() : null,
      updatedAt: document.updatedAt ? document.updatedAt.toISOString() : null,
      dbsUpdateServiceCheckedAt: document.dbsUpdateServiceCheckedAt
        ? document.dbsUpdateServiceCheckedAt.toISOString()
        : null,
      status: this.getDocumentStatus(document.expiryDate),
    }));

    const expiredDocuments = documents
      .filter((document: any) => document.status === 'EXPIRED')
      .map((document: any) => `Document expired: ${document.title}`);

    const expiringDocuments = documents
      .filter((document: any) => document.status === 'EXPIRING')
      .map((document: any) => `Document expiring soon: ${document.title}`);

    const vehicle = driver.vehicle
      ? this.mapVehicleForDriver(driver.vehicle)
      : null;

    const vehicleBlockedReasons =
      vehicle?.dispatch?.blockedReasons?.map(
        (reason: string) => `Assigned vehicle: ${reason}`,
      ) ?? [];

    const blockedReasons = [
      ...expiredCoreItems,
      ...expiredDocuments,
      ...(vehicle ? vehicleBlockedReasons : ['No vehicle assigned']),
    ];

    const blocked = blockedReasons.length > 0;
    const status = (driver.status || '').toUpperCase();
    const onlineStatuses = ['ONLINE', 'AVAILABLE', 'ON_DUTY'];
    const busyStatuses = ['OFFERED', 'BUSY'];

    return {
      id: driver.id,
      name: driver.name,
      username: driver.username ?? null,
      phone: driver.phone ?? null,
      email: driver.email ?? null,
      pin: driver.pin ?? null,
      status: driver.status,
      latitude: driver.latitude ?? null,
      longitude: driver.longitude ?? null,
      heading: driver.heading ?? null,
      speed: driver.speed ?? null,
      lastLocationAt: driver.lastLocationAt
        ? driver.lastLocationAt.toISOString()
        : null,
      licenceNumber: driver.licenceNumber ?? null,
      badgeExpiry: driver.badgeExpiry ? driver.badgeExpiry.toISOString() : null,
      dbsExpiry: driver.dbsExpiry ? driver.dbsExpiry.toISOString() : null,
      licenceExpiry: driver.licenceExpiry
        ? driver.licenceExpiry.toISOString()
        : null,
      createdAt: driver.createdAt ? driver.createdAt.toISOString() : null,
      vehicle,
      documents,
      isOnDuty: onlineStatuses.includes(status),
      isAvailable: !blocked && onlineStatuses.includes(status),
      isBusy: busyStatuses.includes(status),
      dispatch: {
        assignable: !blocked,
        available: !blocked && onlineStatuses.includes(status),
        blockedReasons,
      },
      compliance: {
        blocked,
        overallStatus:
          expiredCoreItems.length > 0 || expiredDocuments.length > 0
            ? 'EXPIRED'
            : expiringCoreItems.length > 0 || expiringDocuments.length > 0
              ? 'EXPIRING'
              : 'VALID',
        expiredCoreItems,
        expiringCoreItems,
        expiredDocuments,
        expiringDocuments,
      },
    };
  }

  private mapVehicleForDriver(vehicle: any) {
    const blockedReasons: string[] = [];

    if (vehicle.status === 'OFF_ROAD') {
      blockedReasons.push('Vehicle is marked OFF_ROAD');
    }

    if (vehicle.status === 'INACTIVE') {
      blockedReasons.push('Vehicle is marked INACTIVE');
    }

    const coreChecks = [
      {
        label: 'MOT',
        expiry: vehicle.motExpiry,
      },
      {
        label: 'Insurance',
        expiry: vehicle.insuranceExpiry,
      },
      {
        label: 'Inspection',
        expiry: vehicle.inspectionExpiry,
      },
      {
        label: 'Vehicle licence',
        expiry: vehicle.vehicleLicenceExpiry,
      },
      {
        label: 'Tax',
        expiry: vehicle.taxExpiry,
      },
    ];

    const expiredCoreItems: string[] = [];
    const expiringCoreItems: string[] = [];

    for (const item of coreChecks) {
      const status = this.getDocumentStatus(item.expiry);

      if (status === 'EXPIRED') {
        expiredCoreItems.push(`${item.label} has expired`);
        blockedReasons.push(`${item.label} has expired`);
      }

      if (status === 'EXPIRING') {
        expiringCoreItems.push(`${item.label} expiring soon`);
      }
    }

    const documents = (vehicle.documents ?? []).map((document: any) => {
      const status = this.getDocumentStatus(document.expiryDate);

      if (status === 'EXPIRED') {
        blockedReasons.push(`Document expired: ${document.title}`);
      }

      return {
        ...document,
        issueDate: document.issueDate ? document.issueDate.toISOString() : null,
        expiryDate: document.expiryDate ? document.expiryDate.toISOString() : null,
        createdAt: document.createdAt ? document.createdAt.toISOString() : null,
        updatedAt: document.updatedAt ? document.updatedAt.toISOString() : null,
        status,
      };
    });

    const expiredDocuments = documents
      .filter((document: any) => document.status === 'EXPIRED')
      .map((document: any) => `Document expired: ${document.title}`);

    const expiringDocuments = documents
      .filter((document: any) => document.status === 'EXPIRING')
      .map((document: any) => `Document expiring soon: ${document.title}`);

    const blocked = blockedReasons.length > 0;

    return {
      id: vehicle.id,
      reg: vehicle.reg,
      registration: vehicle.reg,
      make: vehicle.make ?? null,
      model: vehicle.model ?? null,
      colour: vehicle.colour ?? null,
      capacity: vehicle.capacity ?? null,
      status: vehicle.status,
      plateNumber: vehicle.plateNumber ?? null,
      vin: vehicle.vin ?? null,
      motExpiry: vehicle.motExpiry ? vehicle.motExpiry.toISOString() : null,
      insuranceExpiry: vehicle.insuranceExpiry
        ? vehicle.insuranceExpiry.toISOString()
        : null,
      inspectionExpiry: vehicle.inspectionExpiry
        ? vehicle.inspectionExpiry.toISOString()
        : null,
      vehicleLicenceExpiry: vehicle.vehicleLicenceExpiry
        ? vehicle.vehicleLicenceExpiry.toISOString()
        : null,
      taxExpiry: vehicle.taxExpiry ? vehicle.taxExpiry.toISOString() : null,
      serviceDate: vehicle.serviceDate ? vehicle.serviceDate.toISOString() : null,
      notes: vehicle.notes ?? null,
      dispatch: {
        assignable: !blocked,
        blockedReasons,
      },
      compliance: {
        blocked,
        overallStatus:
          expiredCoreItems.length > 0 || expiredDocuments.length > 0
            ? 'EXPIRED'
            : expiringCoreItems.length > 0 || expiringDocuments.length > 0
              ? 'EXPIRING'
              : 'VALID',
        expiredCoreItems,
        expiringCoreItems,
        expiredDocuments,
        expiringDocuments,
      },
      documents,
    };
  }

  private async runGeofenceAutomation(driverId: string, companyId: string) {
    const activeBooking = await this.prisma.booking.findFirst({
      where: {
        companyId,
        driverId,
        status: {
          in: ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'],
        },
      },
      include: {
        driver: true,
        company: true,
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { pickupTime: 'asc' },
    });

    if (!activeBooking || !activeBooking.driver) {
      return;
    }

    const driverLat = activeBooking.driver.latitude;
    const driverLng = activeBooking.driver.longitude;

    if (driverLat == null || driverLng == null) {
      return;
    }

    const pickupDistance =
      activeBooking.pickupLat != null && activeBooking.pickupLng != null
        ? this.haversineMiles(
            driverLat,
            driverLng,
            activeBooking.pickupLat,
            activeBooking.pickupLng,
          )
        : null;

    const dropoffDistance =
      activeBooking.dropoffLat != null && activeBooking.dropoffLng != null
        ? this.haversineMiles(
            driverLat,
            driverLng,
            activeBooking.dropoffLat,
            activeBooking.dropoffLng,
          )
        : null;

    if (
      pickupDistance != null &&
      pickupDistance <= this.pickupGeofenceMiles &&
      ['ACCEPTED', 'EN_ROUTE'].includes(activeBooking.status)
    ) {
      await this.prisma.booking.update({
        where: { id: activeBooking.id },
        data: { status: 'ARRIVED' },
      });

      await this.prisma.bookingEvent.create({
        data: {
          bookingId: activeBooking.id,
          message: `GEOFENCE ARRIVED · driver reached pickup (${pickupDistance.toFixed(
            2,
          )} miles)`,
        },
      });

      const refreshed = await this.findBookingWithRelations(
        activeBooking.id,
        companyId,
      );

      this.realtime.bookingStatusChanged(companyId, refreshed);
      this.realtime.bookingUpdated(companyId, refreshed);
      return;
    }

    if (
      dropoffDistance != null &&
      dropoffDistance <= this.dropoffGeofenceMiles &&
      activeBooking.status === 'ON_JOB'
    ) {
      await this.prisma.booking.update({
        where: { id: activeBooking.id },
        data: { status: 'COMPLETED' },
      });

      const freedDriver = await this.prisma.driver.update({
        where: { id: driverId },
        data: { status: 'AVAILABLE' },
      });

      await this.prisma.bookingEvent.create({
        data: {
          bookingId: activeBooking.id,
          message: `GEOFENCE COMPLETED · driver reached dropoff (${dropoffDistance.toFixed(
            2,
          )} miles)`,
        },
      });

      const refreshed = await this.findBookingWithRelations(
        activeBooking.id,
        companyId,
      );

      this.realtime.bookingStatusChanged(companyId, refreshed);
      this.realtime.bookingUpdated(companyId, refreshed);

      const mapped = await this.getDriverProfile(freedDriver.id);
      this.realtime.driverUpdated(companyId, mapped);
    }
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
          orderBy: { createdAt: 'desc' },
        },
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
