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

    const payload = {
      id: updatedDriver.id,
      companyId: updatedDriver.companyId,
      name: updatedDriver.name,
      phone: updatedDriver.phone ?? null,
      status: updatedDriver.status,
      latitude: updatedDriver.latitude ?? null,
      longitude: updatedDriver.longitude ?? null,
      heading: updatedDriver.heading ?? null,
      speed: updatedDriver.speed ?? null,
      lastLocationAt: updatedDriver.lastLocationAt ?? null,
      vehicle: updatedDriver.vehicle
        ? {
            id: updatedDriver.vehicle.id,
            reg: updatedDriver.vehicle.reg ?? null,
            plateNumber: updatedDriver.vehicle.plateNumber ?? null,
            make: updatedDriver.vehicle.make ?? null,
            model: updatedDriver.vehicle.model ?? null,
            colour: updatedDriver.vehicle.colour ?? null,
          }
        : null,
    };

    this.realtime.driverLocation(updatedDriver.companyId, {
      driverId: updatedDriver.id,
      latitude,
      longitude,
      heading,
      speed,
      lastLocationAt: updatedDriver.lastLocationAt?.toISOString(),
    });

    this.realtime.driverUpdated(updatedDriver.companyId, payload);

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
    } else if (['EN_ROUTE', 'ARRIVED', 'ON_JOB'].includes(input.nextStatus)) {
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
          in: ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'OFFERED'],
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
          in: ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'OFFERED'],
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
        return 'DRIVER UPDATE · driver marked job as EN_ROUTE';
      case 'ARRIVED':
        return 'DRIVER UPDATE · driver marked job as ARRIVED';
      case 'ON_JOB':
        return 'DRIVER UPDATE · driver marked passenger as ON_JOB';
      case 'COMPLETED':
        return 'DRIVER UPDATE · driver marked job as COMPLETED';
      case 'NO_SHOW':
        return 'DRIVER UPDATE · driver marked passenger as NO_SHOW';
      default:
        return `DRIVER UPDATE · ${nextStatus}`;
    }
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