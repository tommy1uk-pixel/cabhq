import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlinkSync, existsSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

type UploadedMulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
};

type CreateDriverInput = {
  companyId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  pin: string;
  licenceNumber?: string | null;
  badgeExpiry?: string | null;
  dbsExpiry?: string | null;
  licenceExpiry?: string | null;
};

type UpdateDriverInput = {
  driverId: string;
  companyId: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  pin?: string | null;
  status?: string;
  licenceNumber?: string | null;
  badgeExpiry?: string | null;
  dbsExpiry?: string | null;
  licenceExpiry?: string | null;
};

type UpdateDriverStatusInput = {
  driverId: string;
  companyId: string;
  status: string;
};

type UpdateDriverLocationInput = {
  driverId: string;
  companyId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
};

type UploadDriverDocumentInput = {
  driverId: string;
  companyId: string;
  file?: UploadedMulterFile;
  documentType: string;
  title?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  dbsUpdateServiceEnabled?: string;
  dbsUpdateServiceReference?: string;
  dbsUpdateServiceCheckedAt?: string;
};

type DeleteDriverDocumentInput = {
  driverId: string;
  documentId: string;
  companyId: string;
};

@Injectable()
export class DriversService {
  private readonly pickupGeofenceMiles = 0.1;
  private readonly dropoffGeofenceMiles = 0.1;
  private readonly expiryWarningDays = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

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

  private async getDriverOrThrow(driverId: string, companyId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: {
        id: driverId,
        companyId,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  private mapDriver(driver: any) {
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

    const vehicleBlockedReasons =
      driver.vehicle?.dispatch?.blockedReasons?.map(
        (reason: string) => `Assigned vehicle: ${reason}`,
      ) ?? [];

    const blockedReasons = [
      ...expiredCoreItems,
      ...expiredDocuments,
      ...(driver.vehicle ? vehicleBlockedReasons : ['No vehicle assigned']),
    ];

    const blocked = blockedReasons.length > 0;

    const activeShift = driver.shifts?.[0] ?? null;

    const shift = activeShift
      ? {
          ...activeShift,
          active: !activeShift.endedAt,
          startedAt: activeShift.startedAt
            ? activeShift.startedAt.toISOString()
            : null,
          endedAt: activeShift.endedAt
            ? activeShift.endedAt.toISOString()
            : null,
          createdAt: activeShift.createdAt
            ? activeShift.createdAt.toISOString()
            : null,
          updatedAt: activeShift.updatedAt
            ? activeShift.updatedAt.toISOString()
            : null,
        }
      : null;

    return {
      ...driver,
      badgeExpiry: driver.badgeExpiry ? driver.badgeExpiry.toISOString() : null,
      dbsExpiry: driver.dbsExpiry ? driver.dbsExpiry.toISOString() : null,
      licenceExpiry: driver.licenceExpiry
        ? driver.licenceExpiry.toISOString()
        : null,
      createdAt: driver.createdAt ? driver.createdAt.toISOString() : null,
      lastLocationAt: driver.lastLocationAt
        ? driver.lastLocationAt.toISOString()
        : null,
      vehicle: driver.vehicle ?? null,
      documents,
      shift,
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
    };
  }

  async refreshDriverDocumentStatuses(driverId: string) {
    const documents = await this.prisma.driverDocument.findMany({
      where: { driverId },
      select: {
        id: true,
        expiryDate: true,
      },
    });

    if (!documents.length) return;

    await Promise.all(
      documents.map((document) =>
        this.prisma.driverDocument.update({
          where: { id: document.id },
          data: {
            status: this.getDocumentStatus(document.expiryDate) as any,
          },
        }),
      ),
    );
  }

  private async getVehicleDispatchMap(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId },
      include: {
        driver: true,
        documents: true,
      },
    });

    const map = new Map<string, { assignable: boolean; blockedReasons: string[] }>();

    for (const vehicle of vehicles) {
      const coreStatuses = [
        {
          label: 'MOT',
          status: this.getDocumentStatus(vehicle.motExpiry),
        },
        {
          label: 'Insurance',
          status: this.getDocumentStatus(vehicle.insuranceExpiry),
        },
        {
          label: 'Inspection',
          status: this.getDocumentStatus(vehicle.inspectionExpiry),
        },
        {
          label: 'Vehicle licence',
          status: this.getDocumentStatus(vehicle.vehicleLicenceExpiry),
        },
        {
          label: 'Tax',
          status: this.getDocumentStatus(vehicle.taxExpiry),
        },
      ];

      const blockedReasons: string[] = [];

      if (vehicle.status === 'OFF_ROAD') {
        blockedReasons.push('Vehicle is marked OFF_ROAD');
      }

      if (vehicle.status === 'INACTIVE') {
        blockedReasons.push('Vehicle is marked INACTIVE');
      }

      for (const item of coreStatuses) {
        if (item.status === 'EXPIRED') {
          blockedReasons.push(`${item.label} has expired`);
        }
      }

      for (const document of vehicle.documents ?? []) {
        const documentStatus = this.getDocumentStatus(document.expiryDate);
        if (documentStatus === 'EXPIRED') {
          blockedReasons.push(`Document expired: ${document.title}`);
        }
      }

      map.set(vehicle.id, {
        assignable: blockedReasons.length === 0,
        blockedReasons,
      });
    }

    return map;
  }

  async list(companyId: string) {
    const drivers = await this.prisma.driver.findMany({
      where: { companyId },
      include: {
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        vehicle: true,
        shifts: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    await Promise.all(
      drivers.map((driver) => this.refreshDriverDocumentStatuses(driver.id)),
    );

    const vehicleDispatchMap = await this.getVehicleDispatchMap(companyId);

    const refreshedDrivers = await this.prisma.driver.findMany({
      where: { companyId },
      include: {
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        vehicle: true,
        shifts: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return refreshedDrivers.map((driver) => {
      const vehicle = driver.vehicle
        ? {
            ...driver.vehicle,
            dispatch: vehicleDispatchMap.get(driver.vehicle.id) ?? {
              assignable: true,
              blockedReasons: [],
            },
          }
        : null;

      return this.mapDriver({
        ...driver,
        vehicle,
      });
    });
  }

  async findOne(driverId: string, companyId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: {
        id: driverId,
        companyId,
      },
      include: {
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        vehicle: true,
        shifts: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    await this.refreshDriverDocumentStatuses(driverId);

    const vehicleDispatchMap = await this.getVehicleDispatchMap(companyId);

    const refreshed = await this.prisma.driver.findFirstOrThrow({
      where: {
        id: driverId,
        companyId,
      },
      include: {
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        vehicle: true,
        shifts: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    const vehicle = refreshed.vehicle
      ? {
          ...refreshed.vehicle,
          dispatch: vehicleDispatchMap.get(refreshed.vehicle.id) ?? {
            assignable: true,
            blockedReasons: [],
          },
        }
      : null;

    return this.mapDriver({
      ...refreshed,
      vehicle,
    });
  }

  async create(input: CreateDriverInput) {
    const name = input.name.trim();
    const pin = input.pin.trim();

    if (!name) {
      throw new BadRequestException('Driver name is required');
    }

    if (!pin) {
      throw new BadRequestException('Driver PIN is required');
    }

    const driver = await this.prisma.driver.create({
      data: {
        companyId: input.companyId,
        name,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        pin,
        status: 'AVAILABLE',
        licenceNumber: input.licenceNumber?.trim() || null,
        badgeExpiry: input.badgeExpiry ? new Date(input.badgeExpiry) : null,
        dbsExpiry: input.dbsExpiry ? new Date(input.dbsExpiry) : null,
        licenceExpiry: input.licenceExpiry ? new Date(input.licenceExpiry) : null,
      },
    });

    const mapped = await this.findOne(driver.id, driver.companyId);
    this.realtime.driverUpdated(driver.companyId, mapped);

    return mapped;
  }

  async update(input: UpdateDriverInput) {
    const existing = await this.prisma.driver.findFirst({
      where: {
        id: input.driverId,
        companyId: input.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Driver not found');
    }

    const data: {
      name?: string;
      phone?: string | null;
      email?: string | null;
      pin?: string;
      status?: string;
      licenceNumber?: string | null;
      badgeExpiry?: Date | null;
      dbsExpiry?: Date | null;
      licenceExpiry?: Date | null;
    } = {};

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();

      if (!trimmedName) {
        throw new BadRequestException('Driver name cannot be empty');
      }

      data.name = trimmedName;
    }

    if (input.phone !== undefined) {
      data.phone = input.phone?.trim() || null;
    }

    if (input.email !== undefined) {
      data.email = input.email?.trim() || null;
    }

    if (input.pin !== undefined && input.pin !== null) {
      const trimmedPin = input.pin.trim();

      if (!trimmedPin) {
        throw new BadRequestException('Driver PIN cannot be empty');
      }

      data.pin = trimmedPin;
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    if (input.licenceNumber !== undefined) {
      data.licenceNumber = input.licenceNumber?.trim() || null;
    }

    if (input.badgeExpiry !== undefined) {
      data.badgeExpiry = input.badgeExpiry ? new Date(input.badgeExpiry) : null;
    }

    if (input.dbsExpiry !== undefined) {
      data.dbsExpiry = input.dbsExpiry ? new Date(input.dbsExpiry) : null;
    }

    if (input.licenceExpiry !== undefined) {
      data.licenceExpiry = input.licenceExpiry ? new Date(input.licenceExpiry) : null;
    }

    await this.prisma.driver.update({
      where: { id: existing.id },
      data,
    });

    const mapped = await this.findOne(existing.id, existing.companyId);
    this.realtime.driverUpdated(existing.companyId, mapped);

    return mapped;
  }

  async updateStatus(input: UpdateDriverStatusInput) {
    const existing = await this.prisma.driver.findFirst({
      where: {
        id: input.driverId,
        companyId: input.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Driver not found');
    }

    await this.prisma.driver.update({
      where: { id: existing.id },
      data: { status: input.status },
    });

    const mapped = await this.findOne(existing.id, existing.companyId);
    this.realtime.driverUpdated(existing.companyId, mapped);

    return mapped;
  }

  async listShifts(driverId: string, companyId: string) {
    await this.getDriverOrThrow(driverId, companyId);

    const shifts = await this.prisma.driverShift.findMany({
      where: {
        driverId,
        companyId,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        driverId,
        companyId,
      },
      select: {
        id: true,
        status: true,
        pickupTime: true,
        createdAt: true,
      },
    });

    return shifts.map((shift) => {
      const shiftStart = new Date(shift.startedAt).getTime();
      const shiftEnd = shift.endedAt
        ? new Date(shift.endedAt).getTime()
        : Date.now();

      const shiftBookings = bookings.filter((booking) => {
        const bookingTime = new Date(
          booking.pickupTime ?? booking.createdAt,
        ).getTime();

        return bookingTime >= shiftStart && bookingTime <= shiftEnd;
      });

      const completedJobs = shiftBookings.filter(
        (booking) => booking.status === 'COMPLETED',
      ).length;

      const cancelledJobs = shiftBookings.filter(
        (booking) => booking.status === 'CANCELLED',
      ).length;

      const activeJobs = shiftBookings.filter((booking) =>
        ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB'].includes(booking.status),
      ).length;

      const durationMinutes = Math.max(
        0,
        Math.round((shiftEnd - shiftStart) / (1000 * 60)),
      );

      return {
        ...shift,
        active: !shift.endedAt,
        startedAt: shift.startedAt ? shift.startedAt.toISOString() : null,
        endedAt: shift.endedAt ? shift.endedAt.toISOString() : null,
        createdAt: shift.createdAt ? shift.createdAt.toISOString() : null,
        updatedAt: shift.updatedAt ? shift.updatedAt.toISOString() : null,
        summary: {
          totalJobs: shiftBookings.length,
          completedJobs,
          cancelledJobs,
          activeJobs,
        },
        durationMinutes,
      };
    });
  }

  async getShiftHistory(driverId: string, companyId: string) {
    return this.listShifts(driverId, companyId);
  }

  async startShift(driverId: string, companyId: string) {
    const driver = await this.getDriverOrThrow(driverId, companyId);

    const existingActiveShift = await this.prisma.driverShift.findFirst({
      where: {
        driverId,
        companyId,
        endedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (existingActiveShift) {
      return this.findOne(driverId, companyId);
    }

    await this.prisma.driverShift.create({
      data: {
        driverId,
        companyId,
        startedAt: new Date(),
        startStatus: driver.status,
      },
    });

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        status: ['OFF_DUTY', 'INACTIVE'].includes(driver.status)
          ? 'ONLINE'
          : driver.status,
      },
    });

    const mapped = await this.findOne(driverId, companyId);
    this.realtime.driverUpdated(companyId, mapped);

    return mapped;
  }

  async endShift(driverId: string, companyId: string) {
    await this.getDriverOrThrow(driverId, companyId);

    const activeShift = await this.prisma.driverShift.findFirst({
      where: {
        driverId,
        companyId,
        endedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!activeShift) {
      throw new BadRequestException('No active shift found');
    }

    const activeBookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        driverId,
        status: {
          in: ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_JOB', 'OFFERED'],
        },
      },
    });

    if (activeBookings.length > 0) {
      throw new BadRequestException(
        'Cannot end shift while driver still has active jobs or offers',
      );
    }

    await this.prisma.driverShift.update({
      where: { id: activeShift.id },
      data: {
        endedAt: new Date(),
        endStatus: 'OFF_DUTY',
      },
    });

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        status: 'OFF_DUTY',
      },
    });

    const mapped = await this.findOne(driverId, companyId);
    this.realtime.driverUpdated(companyId, mapped);

    return mapped;
  }

  async remove(driverId: string, companyId: string) {
    const existing = await this.prisma.driver.findFirst({
      where: {
        id: driverId,
        companyId,
      },
      include: {
        bookings: {
          where: {
            status: {
              in: [
                'BOOKED',
                'OFFERED',
                'NO_DRIVER',
                'ACCEPTED',
                'EN_ROUTE',
                'ARRIVED',
                'ON_JOB',
              ],
            },
          },
          take: 1,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Driver not found');
    }

    if (existing.bookings.length > 0) {
      throw new BadRequestException(
        'Cannot delete a driver with active bookings',
      );
    }

    await this.prisma.driver.delete({
      where: { id: existing.id },
    });

    this.realtime.driverUpdated(companyId, {
      ...existing,
      status: 'DELETED',
    });

    return { success: true };
  }

  async listDocuments(driverId: string, companyId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: {
        id: driverId,
        companyId,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    await this.refreshDriverDocumentStatuses(driverId);

    return this.prisma.driverDocument.findMany({
      where: {
        driverId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async uploadDocument(input: UploadDriverDocumentInput) {
    const driver = await this.prisma.driver.findFirst({
      where: {
        id: input.driverId,
        companyId: input.companyId,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (!input.file) {
      throw new BadRequestException('File is required');
    }

    if (!input.documentType) {
      throw new BadRequestException('Document type is required');
    }

    const validTypes = [
      'DRIVING_LICENCE',
      'DBS_CHECK',
      'TAXI_BADGE',
      'MEDICAL_CERTIFICATE',
      'RIGHT_TO_WORK',
      'INSURANCE',
      'OTHER',
    ];

    if (!validTypes.includes(input.documentType)) {
      throw new BadRequestException('Invalid document type');
    }

    const isDbs = input.documentType === 'DBS_CHECK';
    const expiryDate = input.expiryDate ? new Date(input.expiryDate) : null;

    const document = await this.prisma.driverDocument.create({
      data: {
        driverId: input.driverId,
        documentType: input.documentType as any,
        title: input.title?.trim() || input.file.originalname,
        fileName: input.file.originalname,
        filePath: `/uploads/drivers/${input.driverId}/${input.file.filename}`,
        mimeType: input.file.mimetype || null,
        fileSize: input.file.size || null,
        issueDate: input.issueDate ? new Date(input.issueDate) : null,
        expiryDate,
        status: this.getDocumentStatus(expiryDate) as any,
        notes: input.notes?.trim() || null,
        dbsUpdateServiceEnabled: isDbs
          ? input.dbsUpdateServiceEnabled === 'true'
          : false,
        dbsUpdateServiceReference: isDbs
          ? input.dbsUpdateServiceReference?.trim() || null
          : null,
        dbsUpdateServiceCheckedAt:
          isDbs && input.dbsUpdateServiceCheckedAt
            ? new Date(input.dbsUpdateServiceCheckedAt)
            : null,
      },
    });

    const mapped = await this.findOne(input.driverId, input.companyId);
    this.realtime.driverUpdated(input.companyId, mapped);

    return document;
  }

  async deleteDocument(input: DeleteDriverDocumentInput) {
    const driver = await this.prisma.driver.findFirst({
      where: {
        id: input.driverId,
        companyId: input.companyId,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const document = await this.prisma.driverDocument.findFirst({
      where: {
        id: input.documentId,
        driverId: input.driverId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const absolutePath = `${process.cwd()}${document.filePath}`;

    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }

    await this.prisma.driverDocument.delete({
      where: {
        id: document.id,
      },
    });

    const mapped = await this.findOne(input.driverId, input.companyId);
    this.realtime.driverUpdated(input.companyId, mapped);

    return { success: true };
  }

  async updateLocation(input: UpdateDriverLocationInput) {
    const existing = await this.prisma.driver.findFirst({
      where: {
        id: input.driverId,
        companyId: input.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Driver not found');
    }

    const updated = await this.prisma.driver.update({
      where: { id: existing.id },
      data: {
        latitude: input.latitude,
        longitude: input.longitude,
        heading: input.heading ?? null,
        speed: input.speed ?? null,
        lastLocationAt: new Date(),
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

    const mapped = await this.findOne(updated.id, updated.companyId);
    this.realtime.driverUpdated(updated.companyId, mapped);

    await this.runGeofenceAutomation(updated.id, updated.companyId);

    return mapped;
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
      const mapped = await this.findOne(freedDriver.id, companyId);
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