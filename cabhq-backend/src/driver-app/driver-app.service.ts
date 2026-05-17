import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { DriverDispatchService } from '../dispatch/driver-dispatch.service';
import { RealtimeService } from '../realtime/realtime.service';

type DriverLoginInput = {
  driverId?: string;
  phone?: string;
  pin: string;
};

type DriverOfferResponseInput = {
  driverId: string;
  bookingId: string;
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

type MarkJobStatusInput = {
  driverId: string;
  bookingId: string;
  nextStatus: 'EN_ROUTE' | 'ARRIVED' | 'ON_JOB' | 'COMPLETED' | 'NO_SHOW';
};

type StartShiftInput = {
  driverId: string;
  notes?: string | null;
  startStatus?: 'ONLINE' | 'ON_DUTY' | 'AVAILABLE' | null;
};

type EndShiftInput = {
  driverId: string;
  notes?: string | null;
  endStatus?: 'OFF_DUTY' | 'AVAILABLE' | null;
};

type LatLngPoint = {
  latitude: number;
  longitude: number;
};

const ACTIVE_JOB_STATUSES = [
  'ACCEPTED',
  'EN_ROUTE',
  'ARRIVED',
  'ON_JOB',
  'OFFERED',
] as const;

const DRIVER_BUSY_STATUSES = ['EN_ROUTE', 'ARRIVED', 'ON_JOB'] as const;

const AUTO_ARRIVED_DISTANCE_MILES = 0.05;

@Injectable()
export class DriverAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly driverDispatchService: DriverDispatchService,
    private readonly realtime: RealtimeService,
  ) {}

  async login(input: DriverLoginInput) {
    const driverId = input.driverId?.trim() || null;
    const phone = input.phone?.trim() || null;
    const pin = input.pin?.trim();

    if (!driverId && !phone) {
      throw new BadRequestException('Driver ID or phone is required');
    }

    if (!pin) {
      throw new BadRequestException('PIN is required');
    }

    const driver = driverId
      ? await this.prisma.driver.findUnique({
          where: { id: driverId },
        })
      : await this.prisma.driver.findFirst({
          where: { phone },
        });

    if (!driver) {
      throw new UnauthorizedException('Invalid driver credentials');
    }

    if ((driver.pin ?? '').trim() !== pin) {
      throw new UnauthorizedException('Invalid driver credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: driver.id,
      driverId: driver.id,
      companyId: driver.companyId,
      role: 'DRIVER',
      type: 'driver_app',
    });

    const bootstrap = await this.bootstrap(driver.id);

    return {
      token: accessToken,
      accessToken,
      access_token: accessToken,
      driverToken: accessToken,
      ...bootstrap,
    };
  }

  async bootstrap(driverId: string) {
    await this.ensureDriver(driverId);

    const [driver, offerResult, activeJobsResult, currentShift] =
      await Promise.all([
        this.driverDispatchService.getDriverProfile(driverId),
        this.driverDispatchService.getActiveOffer(driverId),
        this.driverDispatchService.getActiveJobs(driverId),
        this.getCurrentShift(driverId),
      ]);

    const activeJobs = activeJobsResult.jobs ?? [];
    const offer = offerResult.offer ?? null;
    const currentJob = activeJobs[0] ?? null;

    return {
      driver,
      offer,
      activeJobs,
      currentJob,
      currentShift,
      map: {
        driver,
        activeJob: currentJob,
        activeOffer: offer,
        activeJobs,
        updatedAt: new Date().toISOString(),
      },
      home: {
        hasActiveOffer: Boolean(offer),
        hasActiveJob: Boolean(currentJob),
        activeOfferSecondsRemaining: offer?.offer?.secondsRemaining ?? 0,
        activeOfferExpiresAt: offer?.offer?.expiresAt ?? null,
        onShift: Boolean(currentShift.shift),
        shiftStartedAt: currentShift.shift?.startedAt ?? null,
      },
    };
  }

  async getDriverProfile(driverId: string) {
    await this.ensureDriver(driverId);
    return this.driverDispatchService.getDriverProfile(driverId);
  }

  async getActiveOffer(driverId: string) {
    await this.ensureDriver(driverId);
    return this.driverDispatchService.getActiveOffer(driverId);
  }

  async getActiveJobs(driverId: string) {
    await this.ensureDriver(driverId);
    return this.driverDispatchService.getActiveJobs(driverId);
  }

  async getJobHistory(driverId: string) {
    await this.ensureDriver(driverId);
    return this.driverDispatchService.getJobHistory(driverId);
  }

  async respondToOffer(input: DriverOfferResponseInput) {
    await this.ensureDriver(input.driverId);

    const result = await this.driverDispatchService.respond({
      driverId: input.driverId,
      bookingId: input.bookingId,
      action: input.action,
    });

    return {
      ...result,
      bootstrap: await this.bootstrap(input.driverId),
    };
  }

  async updateDriverStatus(input: UpdateDriverStatusInput) {
    await this.ensureDriver(input.driverId);

    const result = await this.driverDispatchService.updateDriverStatus({
      driverId: input.driverId,
      status: input.status,
    });

    return {
      success: true,
      driver: result,
      bootstrap: await this.bootstrap(input.driverId),
    };
  }

  async updateLocation(input: UpdateDriverLocationInput) {
    const driver = await this.ensureDriver(input.driverId);

    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new BadRequestException('Invalid latitude');
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Invalid longitude');
    }

    const heading =
      input.heading === null || input.heading === undefined
        ? null
        : Number.isFinite(Number(input.heading))
          ? Number(input.heading)
          : null;

    const speed =
      input.speed === null || input.speed === undefined
        ? null
        : Number.isFinite(Number(input.speed))
          ? Number(input.speed)
          : null;

    const updatedDriver = await this.prisma.driver.update({
      where: {
        id: driver.id,
      },
      data: {
        latitude,
        longitude,
        heading,
        speed,
        lastLocationAt: new Date(),
      },
      include: {
        vehicle: true,
      },
    });

    const payload = this.mapDriverLocationPayload(updatedDriver);

    this.realtime.driverLocation(updatedDriver.companyId, {
      driverId: updatedDriver.id,
      latitude,
      longitude,
      heading,
      speed,
      lastLocationAt: updatedDriver.lastLocationAt?.toISOString(),
    });

    this.realtime.driverUpdated(updatedDriver.companyId, payload);

    const autoArrivedResult = await this.autoMarkArrivedIfClose({
      driverId: updatedDriver.id,
      companyId: updatedDriver.companyId,
      latitude,
      longitude,
    });

    return {
      success: true,
      driver: payload,
      location: {
        latitude,
        longitude,
        heading,
        speed,
        lastLocationAt: updatedDriver.lastLocationAt,
      },
      autoArrived: autoArrivedResult,
      bootstrap: await this.bootstrap(driver.id),
    };
  }

  async markJobStatus(input: MarkJobStatusInput) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        driverId: input.driverId,
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

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update a cancelled booking');
    }

    if (booking.status === 'COMPLETED') {
      throw new BadRequestException('Booking is already completed');
    }

    if (booking.status === 'NO_SHOW') {
      throw new BadRequestException('Booking is already marked no-show');
    }

    this.validateDriverStatusTransition(booking.status, input.nextStatus);

    const releaseDriver = ['COMPLETED', 'NO_SHOW'].includes(input.nextStatus);

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: input.nextStatus,
        driverId: releaseDriver ? null : booking.driverId,
      },
    });

    await this.prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        message: this.getDriverTimelineMessage(input.nextStatus),
      },
    });

    if (releaseDriver) {
      await this.prisma.driver.update({
        where: { id: input.driverId },
        data: { status: 'AVAILABLE' },
      });
    } else if (DRIVER_BUSY_STATUSES.includes(input.nextStatus as any)) {
      await this.prisma.driver.update({
        where: { id: input.driverId },
        data: { status: 'BUSY' },
      });
    }

    const refreshed = await this.prisma.booking.findFirstOrThrow({
      where: {
        id: booking.id,
      },
      include: {
        driver: true,
        company: true,
        events: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });

    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    const updatedDriver = await this.driverDispatchService.getDriverProfile(
      input.driverId,
    );

    this.realtime.driverUpdated(refreshed.companyId, updatedDriver);

    return {
      success: true,
      booking: this.driverDispatchService.mapBookingForDriverApp(refreshed),
      bootstrap: await this.bootstrap(input.driverId),
    };
  }

  async startShift(input: StartShiftInput) {
    const driver = await this.ensureDriver(input.driverId);

    const activeShift = await this.prisma.driverShift.findFirst({
      where: {
        driverId: input.driverId,
        endedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (activeShift) {
      throw new BadRequestException('Driver already has an active shift');
    }

    const statusToSet = input.startStatus ?? 'ONLINE';

    const shift = await this.prisma.driverShift.create({
      data: {
        driverId: driver.id,
        companyId: driver.companyId,
        startedAt: new Date(),
        startStatus: statusToSet,
        notes: input.notes?.trim() || null,
      },
    });

    await this.prisma.driver.update({
      where: { id: driver.id },
      data: { status: statusToSet },
    });

    const updatedDriver = await this.driverDispatchService.getDriverProfile(
      driver.id,
    );

    this.realtime.driverUpdated(driver.companyId, updatedDriver);

    return {
      success: true,
      shift: await this.mapShiftWithSummary(shift.id),
      bootstrap: await this.bootstrap(driver.id),
    };
  }

  async endShift(input: EndShiftInput) {
    const driver = await this.ensureDriver(input.driverId);

    const activeShift = await this.prisma.driverShift.findFirst({
      where: {
        driverId: input.driverId,
        endedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!activeShift) {
      throw new BadRequestException('No active shift found');
    }

    const activeJobs = await this.prisma.booking.findMany({
      where: {
        driverId: input.driverId,
        status: {
          in: [...ACTIVE_JOB_STATUSES],
        },
      },
      take: 1,
    });

    if (activeJobs.length > 0) {
      throw new BadRequestException(
        'Cannot end shift with active or offered jobs',
      );
    }

    const statusToSet = input.endStatus ?? 'OFF_DUTY';

    await this.prisma.driverShift.update({
      where: { id: activeShift.id },
      data: {
        endedAt: new Date(),
        endStatus: statusToSet,
        notes: input.notes?.trim() || activeShift.notes || null,
      },
    });

    await this.prisma.driver.update({
      where: { id: driver.id },
      data: { status: statusToSet },
    });

    const updatedDriver = await this.driverDispatchService.getDriverProfile(
      driver.id,
    );

    this.realtime.driverUpdated(driver.companyId, updatedDriver);

    return {
      success: true,
      shift: await this.mapShiftWithSummary(activeShift.id),
      bootstrap: await this.bootstrap(driver.id),
    };
  }

  async getCurrentShift(driverId: string) {
    await this.ensureDriver(driverId);

    const shift = await this.prisma.driverShift.findFirst({
      where: {
        driverId,
        endedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!shift) {
      return {
        shift: null,
      };
    }

    return {
      shift: await this.mapShiftWithSummary(shift.id),
    };
  }

  async getShiftHistory(driverId: string) {
    await this.ensureDriver(driverId);

    const shifts = await this.prisma.driverShift.findMany({
      where: { driverId },
      orderBy: { startedAt: 'desc' },
      take: 30,
    });

    return {
      shifts: await Promise.all(
        shifts.map((shift) => this.mapShiftWithSummary(shift.id)),
      ),
    };
  }

  private async autoMarkArrivedIfClose(input: {
    driverId: string;
    companyId: string;
    latitude: number;
    longitude: number;
  }) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        companyId: input.companyId,
        driverId: input.driverId,
        status: 'EN_ROUTE',
      },
      orderBy: {
        pickupTime: 'asc',
      },
    });

    if (!booking) {
      return {
        changed: false,
        reason: 'No en-route job',
      };
    }

    const pickup = this.getBookingPickupPoint(booking);

    if (!pickup) {
      return {
        changed: false,
        reason: 'Pickup coordinates missing',
      };
    }

    const distanceMiles = this.haversineMiles(
      input.latitude,
      input.longitude,
      pickup.latitude,
      pickup.longitude,
    );

    if (distanceMiles > AUTO_ARRIVED_DISTANCE_MILES) {
      return {
        changed: false,
        distanceMiles,
        reason: 'Driver not close enough',
      };
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'ARRIVED' },
    });

    await this.prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        message: 'DRIVER UPDATE · driver auto-marked job as ARRIVED',
      },
    });

    const refreshed = await this.prisma.booking.findFirstOrThrow({
      where: {
        id: booking.id,
      },
      include: {
        driver: true,
        company: true,
        events: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });

    this.realtime.bookingStatusChanged(refreshed.companyId, refreshed);
    this.realtime.bookingUpdated(refreshed.companyId, refreshed);

    return {
      changed: true,
      bookingId: booking.id,
      distanceMiles,
      status: 'ARRIVED',
    };
  }

  private async mapShiftWithSummary(shiftId: string) {
    const shift = await this.prisma.driverShift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const shiftEnd = shift.endedAt ?? new Date();

    const totalJobs = await this.prisma.booking.count({
      where: {
        driverId: shift.driverId,
        createdAt: {
          gte: shift.startedAt,
          lte: shiftEnd,
        },
      },
    });

    const completedJobs = await this.prisma.booking.count({
      where: {
        driverId: shift.driverId,
        status: 'COMPLETED',
        createdAt: {
          gte: shift.startedAt,
          lte: shiftEnd,
        },
      },
    });

    const cancelledJobs = await this.prisma.booking.count({
      where: {
        driverId: shift.driverId,
        status: 'CANCELLED',
        createdAt: {
          gte: shift.startedAt,
          lte: shiftEnd,
        },
      },
    });

    const activeJobs = await this.prisma.booking.count({
      where: {
        driverId: shift.driverId,
        status: {
          in: [...ACTIVE_JOB_STATUSES],
        },
      },
    });

    const durationMinutes = Math.max(
      0,
      Math.round((shiftEnd.getTime() - shift.startedAt.getTime()) / 60000),
    );

    return {
      id: shift.id,
      driverId: shift.driverId,
      companyId: shift.companyId,
      startedAt: shift.startedAt.toISOString(),
      endedAt: shift.endedAt ? shift.endedAt.toISOString() : null,
      startStatus: shift.startStatus ?? null,
      endStatus: shift.endStatus ?? null,
      notes: shift.notes ?? null,
      createdAt: shift.createdAt.toISOString(),
      updatedAt: shift.updatedAt.toISOString(),
      active: !shift.endedAt,
      durationMinutes,
      summary: {
        totalJobs,
        completedJobs,
        cancelledJobs,
        activeJobs,
      },
    };
  }

  private validateDriverStatusTransition(
    currentStatus: string,
    nextStatus: MarkJobStatusInput['nextStatus'],
  ) {
    const current = (currentStatus || '').toUpperCase();

    const transitions: Record<string, MarkJobStatusInput['nextStatus'][]> = {
      ACCEPTED: ['EN_ROUTE', 'ARRIVED', 'NO_SHOW'],
      EN_ROUTE: ['ARRIVED', 'NO_SHOW'],
      ARRIVED: ['ON_JOB', 'NO_SHOW'],
      ON_JOB: ['COMPLETED'],
    };

    const allowed = transitions[current] ?? [];

    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid job status change: ${current} -> ${nextStatus}`,
      );
    }
  }

  private getDriverTimelineMessage(
    nextStatus: MarkJobStatusInput['nextStatus'],
  ) {
    switch (nextStatus) {
      case 'EN_ROUTE':
        return 'Driver marked job as en route';
      case 'ARRIVED':
        return 'Driver arrived at pickup';
      case 'ON_JOB':
        return 'Passenger onboard';
      case 'COMPLETED':
        return 'Journey completed';
      case 'NO_SHOW':
        return 'Passenger no-show';
      default:
        return `Driver updated job to ${nextStatus}`;
    }
  }

  private getBookingPickupPoint(booking: {
    pickupLat?: number | null;
    pickupLng?: number | null;
    pickupLatitude?: number | null;
    pickupLongitude?: number | null;
  }) {
    const latitude = this.toNumberOrNull(
      booking.pickupLat ?? booking.pickupLatitude ?? null,
    );

    const longitude = this.toNumberOrNull(
      booking.pickupLng ?? booking.pickupLongitude ?? null,
    );

    if (!this.isValidLatLng(latitude, longitude)) {
      return null;
    }

    return {
      latitude: latitude as number,
      longitude: longitude as number,
    };
  }

  private mapDriverLocationPayload(driver: any) {
    return {
      id: driver.id,
      companyId: driver.companyId,
      name: driver.name,
      phone: driver.phone ?? null,
      status: driver.status,
      latitude: driver.latitude ?? null,
      longitude: driver.longitude ?? null,
      heading: driver.heading ?? null,
      speed: driver.speed ?? null,
      lastLocationAt: driver.lastLocationAt ?? null,
      vehicle: driver.vehicle
        ? {
            id: driver.vehicle.id,
            reg: driver.vehicle.reg ?? null,
            plateNumber: driver.vehicle.plateNumber ?? null,
            make: driver.vehicle.make ?? null,
            model: driver.vehicle.model ?? null,
            colour: driver.vehicle.colour ?? null,
          }
        : null,
    };
  }

  private toNumberOrNull(value: unknown) {
    if (value === null || value === undefined || value === '') return null;

    const numberValue =
      typeof value === 'number' ? value : Number(String(value).trim());

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private isValidLatLng(lat: number | null, lng: number | null) {
    return (
      lat !== null &&
      lng !== null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
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

  private async ensureDriver(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }
}
