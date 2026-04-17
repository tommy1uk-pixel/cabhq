import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ComplianceDocumentStatus,
  Prisma,
  VehicleDocumentType,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

type CreateVehicleInput = {
  companyId: string;
  reg: string;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  capacity?: number | null;
  status?: string | null;
  plateNumber?: string | null;
  vin?: string | null;
  motExpiry?: string | null;
  insuranceExpiry?: string | null;
  inspectionExpiry?: string | null;
  vehicleLicenceExpiry?: string | null;
  taxExpiry?: string | null;
  serviceDate?: string | null;
  notes?: string | null;
  driverId?: string | null;
};

type UpdateVehicleInput = {
  vehicleId: string;
  companyId: string;
  reg?: string;
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  capacity?: number | null;
  status?: string | null;
  plateNumber?: string | null;
  vin?: string | null;
  motExpiry?: string | null;
  insuranceExpiry?: string | null;
  inspectionExpiry?: string | null;
  vehicleLicenceExpiry?: string | null;
  taxExpiry?: string | null;
  serviceDate?: string | null;
  notes?: string | null;
  driverId?: string | null;
};

type AssignDriverInput = {
  vehicleId: string;
  driverId: string | null;
  companyId: string;
};

type UpdateVehicleStatusInput = {
  vehicleId: string;
  companyId: string;
  status: string;
};

type UploadVehicleDocumentInput = {
  vehicleId: string;
  companyId: string;
  documentType: VehicleDocumentType;
  title: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  file?: Express.Multer.File;
};

type RemoveVehicleDocumentInput = {
  vehicleId: string;
  documentId: string;
  companyId: string;
};

type ComplianceSummaryItem = {
  key: string;
  label: string;
  date: string | null;
  status: ComplianceDocumentStatus;
};

const EXPIRING_SOON_DAYS = 30;

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId },
      include: {
        driver: true,
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        reg: 'asc',
      },
    });

    return vehicles.map((vehicle) => this.mapVehicleWithCompliance(vehicle));
  }

  async getDashboard(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId },
      include: {
        driver: true,
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        reg: 'asc',
      },
    });

    const mapped = vehicles.map((vehicle) =>
      this.mapVehicleWithCompliance(vehicle),
    );

    const totalVehicles = mapped.length;
    const activeVehicles = mapped.filter(
      (vehicle) => vehicle.status === 'ACTIVE',
    ).length;
    const offRoadVehicles = mapped.filter(
      (vehicle) => vehicle.status === 'OFF_ROAD',
    ).length;
    const inactiveVehicles = mapped.filter(
      (vehicle) => vehicle.status === 'INACTIVE',
    ).length;

    const expiredCoreItems = mapped.reduce(
      (count, vehicle) =>
        count +
        vehicle.coreCompliance.filter((item) => item.status === 'EXPIRED').length,
      0,
    );

    const expiringSoonCoreItems = mapped.reduce(
      (count, vehicle) =>
        count +
        vehicle.coreCompliance.filter((item) => item.status === 'EXPIRING').length,
      0,
    );

    const expiredDocuments = mapped.reduce(
      (count, vehicle) =>
        count +
        vehicle.documents.filter((doc) => doc.status === 'EXPIRED').length,
      0,
    );

    const expiringSoonDocuments = mapped.reduce(
      (count, vehicle) =>
        count +
        vehicle.documents.filter((doc) => doc.status === 'EXPIRING').length,
      0,
    );

    const blockedVehicles = mapped.filter(
      (vehicle) => vehicle.dispatch.assignable === false,
    ).length;

    return {
      totalVehicles,
      activeVehicles,
      offRoadVehicles,
      inactiveVehicles,
      expiredCoreItems,
      expiringSoonCoreItems,
      expiredDocuments,
      expiringSoonDocuments,
      blockedVehicles,
      alerts: {
        total:
          expiredCoreItems +
          expiringSoonCoreItems +
          expiredDocuments +
          expiringSoonDocuments,
        expired: expiredCoreItems + expiredDocuments,
        expiring: expiringSoonCoreItems + expiringSoonDocuments,
      },
      vehicles: mapped,
    };
  }

  async getOne(vehicleId: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        companyId,
      },
      include: {
        driver: true,
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.mapVehicleWithCompliance(vehicle);
  }

  async create(input: CreateVehicleInput) {
    const reg = this.normaliseRegistration(input.reg);

    if (!reg) {
      throw new BadRequestException('Vehicle registration is required');
    }

    await this.ensureVehicleRegUnique({
      companyId: input.companyId,
      reg,
    });

    if (input.driverId) {
      await this.ensureDriverBelongsToCompany(input.driverId, input.companyId);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      if (input.driverId) {
        await tx.vehicle.updateMany({
          where: {
            companyId: input.companyId,
            driverId: input.driverId,
          },
          data: {
            driverId: null,
          },
        });
      }

      return tx.vehicle.create({
        data: {
          companyId: input.companyId,
          reg,
          make: this.cleanString(input.make),
          model: this.cleanString(input.model),
          colour: this.cleanString(input.colour),
          capacity: this.normaliseCapacity(input.capacity),
          status: this.normaliseVehicleStatus(input.status),
          plateNumber: this.cleanString(input.plateNumber),
          vin: this.cleanString(input.vin),
          motExpiry: this.parseNullableDate(input.motExpiry),
          insuranceExpiry: this.parseNullableDate(input.insuranceExpiry),
          inspectionExpiry: this.parseNullableDate(input.inspectionExpiry),
          vehicleLicenceExpiry: this.parseNullableDate(
            input.vehicleLicenceExpiry,
          ),
          taxExpiry: this.parseNullableDate(input.taxExpiry),
          serviceDate: this.parseNullableDate(input.serviceDate),
          notes: this.cleanString(input.notes),
          driverId: input.driverId ?? null,
        },
        include: {
          driver: true,
          documents: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
    });

    return this.mapVehicleWithCompliance(created);
  }

  async update(input: UpdateVehicleInput) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: input.vehicleId,
        companyId: input.companyId,
      },
      include: {
        driver: true,
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (input.driverId) {
      await this.ensureDriverBelongsToCompany(input.driverId, input.companyId);
    }

    const data: Prisma.VehicleUpdateInput = {};

    if (typeof input.reg !== 'undefined') {
      const reg = this.normaliseRegistration(input.reg);

      if (!reg) {
        throw new BadRequestException('Vehicle registration is required');
      }

      if (reg !== vehicle.reg) {
        await this.ensureVehicleRegUnique({
          companyId: input.companyId,
          reg,
          excludeVehicleId: vehicle.id,
        });
      }

      data.reg = reg;
    }

    if (typeof input.make !== 'undefined') {
      data.make = this.cleanString(input.make);
    }

    if (typeof input.model !== 'undefined') {
      data.model = this.cleanString(input.model);
    }

    if (typeof input.colour !== 'undefined') {
      data.colour = this.cleanString(input.colour);
    }

    if (typeof input.capacity !== 'undefined') {
      data.capacity = this.normaliseCapacity(input.capacity);
    }

    if (typeof input.status !== 'undefined') {
      data.status = this.normaliseVehicleStatus(input.status);
    }

    if (typeof input.plateNumber !== 'undefined') {
      data.plateNumber = this.cleanString(input.plateNumber);
    }

    if (typeof input.vin !== 'undefined') {
      data.vin = this.cleanString(input.vin);
    }

    if (typeof input.motExpiry !== 'undefined') {
      data.motExpiry = this.parseNullableDate(input.motExpiry);
    }

    if (typeof input.insuranceExpiry !== 'undefined') {
      data.insuranceExpiry = this.parseNullableDate(input.insuranceExpiry);
    }

    if (typeof input.inspectionExpiry !== 'undefined') {
      data.inspectionExpiry = this.parseNullableDate(input.inspectionExpiry);
    }

    if (typeof input.vehicleLicenceExpiry !== 'undefined') {
      data.vehicleLicenceExpiry = this.parseNullableDate(
        input.vehicleLicenceExpiry,
      );
    }

    if (typeof input.taxExpiry !== 'undefined') {
      data.taxExpiry = this.parseNullableDate(input.taxExpiry);
    }

    if (typeof input.serviceDate !== 'undefined') {
      data.serviceDate = this.parseNullableDate(input.serviceDate);
    }

    if (typeof input.notes !== 'undefined') {
      data.notes = this.cleanString(input.notes);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (typeof input.driverId !== 'undefined') {
        if (input.driverId) {
          await tx.vehicle.updateMany({
            where: {
              companyId: input.companyId,
              driverId: input.driverId,
              id: {
                not: vehicle.id,
              },
            },
            data: {
              driverId: null,
            },
          });

          data.driver = {
            connect: { id: input.driverId },
          };
        } else {
          data.driver = {
            disconnect: true,
          };
        }
      }

      return tx.vehicle.update({
        where: {
          id: vehicle.id,
        },
        data,
        include: {
          driver: true,
          documents: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
    });

    return this.mapVehicleWithCompliance(updated);
  }

  async assignDriver(input: AssignDriverInput) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: input.vehicleId,
        companyId: input.companyId,
      },
      include: {
        driver: true,
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (input.driverId) {
      await this.ensureDriverBelongsToCompany(input.driverId, input.companyId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.driverId) {
        await tx.vehicle.updateMany({
          where: {
            companyId: input.companyId,
            driverId: input.driverId,
            id: {
              not: vehicle.id,
            },
          },
          data: {
            driverId: null,
          },
        });

        return tx.vehicle.update({
          where: {
            id: vehicle.id,
          },
          data: {
            driverId: input.driverId,
          },
          include: {
            driver: true,
            documents: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        });
      }

      return tx.vehicle.update({
        where: {
          id: vehicle.id,
        },
        data: {
          driverId: null,
        },
        include: {
          driver: true,
          documents: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
    });

    return this.mapVehicleWithCompliance(updated);
  }

  async updateStatus(input: UpdateVehicleStatusInput) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: input.vehicleId,
        companyId: input.companyId,
      },
      include: {
        driver: true,
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const updated = await this.prisma.vehicle.update({
      where: {
        id: vehicle.id,
      },
      data: {
        status: this.normaliseVehicleStatus(input.status),
      },
      include: {
        driver: true,
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return this.mapVehicleWithCompliance(updated);
  }

  async uploadDocument(input: UploadVehicleDocumentInput) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: input.vehicleId,
        companyId: input.companyId,
      },
      include: {
        driver: true,
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (!input.file) {
      throw new BadRequestException('Vehicle document file is required');
    }

    const title = this.cleanString(input.title);

    if (!title) {
      throw new BadRequestException('Document title is required');
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'vehicles');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const safeOriginalName = input.file.originalname.replace(/[^\w.\-]/g, '_');
    const storedFileName = `${Date.now()}-${vehicle.id}-${safeOriginalName}`;
    const storedFilePath = path.join(uploadsDir, storedFileName);

    fs.writeFileSync(storedFilePath, input.file.buffer);

    const expiryDate = this.parseNullableDate(input.expiryDate);
    const status = this.getComplianceStatus(expiryDate);

    const document = await this.prisma.vehicleDocument.create({
      data: {
        vehicleId: vehicle.id,
        documentType: input.documentType,
        title,
        fileName: input.file.originalname,
        filePath: `/uploads/vehicles/${storedFileName}`,
        mimeType: input.file.mimetype || null,
        fileSize: input.file.size || null,
        issueDate: this.parseNullableDate(input.issueDate),
        expiryDate,
        status,
        notes: this.cleanString(input.notes),
      },
    });

    const refreshedVehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicle.id,
        companyId: input.companyId,
      },
      include: {
        driver: true,
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!refreshedVehicle) {
      throw new NotFoundException('Vehicle not found after document upload');
    }

    return {
      message: 'Vehicle document uploaded successfully',
      document,
      vehicle: this.mapVehicleWithCompliance(refreshedVehicle),
    };
  }

  async removeDocument(input: RemoveVehicleDocumentInput) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: input.vehicleId,
        companyId: input.companyId,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const document = await this.prisma.vehicleDocument.findFirst({
      where: {
        id: input.documentId,
        vehicleId: input.vehicleId,
      },
    });

    if (!document) {
      throw new NotFoundException('Vehicle document not found');
    }

    await this.prisma.vehicleDocument.delete({
      where: {
        id: document.id,
      },
    });

    const physicalPath = path.join(process.cwd(), document.filePath);

    if (fs.existsSync(physicalPath)) {
      fs.unlinkSync(physicalPath);
    }

    return { success: true };
  }

  async remove(vehicleId: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        companyId,
      },
      include: {
        documents: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.prisma.vehicle.delete({
      where: {
        id: vehicle.id,
      },
    });

    for (const document of vehicle.documents) {
      const physicalPath = path.join(process.cwd(), document.filePath);
      if (fs.existsSync(physicalPath)) {
        fs.unlinkSync(physicalPath);
      }
    }

    return { success: true };
  }

  private mapVehicleWithCompliance(vehicle: any) {
    const coreCompliance: ComplianceSummaryItem[] = [
      {
        key: 'motExpiry',
        label: 'MOT',
        date: vehicle.motExpiry ? vehicle.motExpiry.toISOString() : null,
        status: this.getComplianceStatus(vehicle.motExpiry),
      },
      {
        key: 'insuranceExpiry',
        label: 'Insurance',
        date: vehicle.insuranceExpiry
          ? vehicle.insuranceExpiry.toISOString()
          : null,
        status: this.getComplianceStatus(vehicle.insuranceExpiry),
      },
      {
        key: 'inspectionExpiry',
        label: 'Inspection',
        date: vehicle.inspectionExpiry
          ? vehicle.inspectionExpiry.toISOString()
          : null,
        status: this.getComplianceStatus(vehicle.inspectionExpiry),
      },
      {
        key: 'vehicleLicenceExpiry',
        label: 'Vehicle licence',
        date: vehicle.vehicleLicenceExpiry
          ? vehicle.vehicleLicenceExpiry.toISOString()
          : null,
        status: this.getComplianceStatus(vehicle.vehicleLicenceExpiry),
      },
      {
        key: 'taxExpiry',
        label: 'Tax',
        date: vehicle.taxExpiry ? vehicle.taxExpiry.toISOString() : null,
        status: this.getComplianceStatus(vehicle.taxExpiry),
      },
    ];

    const documents = (vehicle.documents ?? []).map((doc: any) => {
      const derivedStatus = this.getComplianceStatus(doc.expiryDate);

      return {
        ...doc,
        issueDate: doc.issueDate ? doc.issueDate.toISOString() : null,
        expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
        updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
        status: derivedStatus,
      };
    });

    const expiredCoreItems = coreCompliance.filter(
      (item) => item.status === 'EXPIRED',
    );
    const expiringCoreItems = coreCompliance.filter(
      (item) => item.status === 'EXPIRING',
    );

    const expiredDocuments = documents.filter(
      (doc: any) => doc.status === 'EXPIRED',
    );
    const expiringDocuments = documents.filter(
      (doc: any) => doc.status === 'EXPIRING',
    );

    const blockedReasons: string[] = [];

    if (vehicle.status === 'OFF_ROAD') {
      blockedReasons.push('Vehicle is marked OFF_ROAD');
    }

    if (vehicle.status === 'INACTIVE') {
      blockedReasons.push('Vehicle is marked INACTIVE');
    }

    for (const item of expiredCoreItems) {
      blockedReasons.push(`${item.label} has expired`);
    }

    for (const document of expiredDocuments) {
      blockedReasons.push(`Document expired: ${document.title}`);
    }

    const blocked = blockedReasons.length > 0;

    return {
      ...vehicle,
      createdAt: vehicle.createdAt ? vehicle.createdAt.toISOString() : null,
      updatedAt: vehicle.updatedAt ? vehicle.updatedAt.toISOString() : null,
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
      serviceDate: vehicle.serviceDate
        ? vehicle.serviceDate.toISOString()
        : null,
      coreCompliance,
      documents,
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

  private getComplianceStatus(
    value: Date | string | null | undefined,
  ): ComplianceDocumentStatus {
    if (!value) {
      return ComplianceDocumentStatus.NO_EXPIRY;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return ComplianceDocumentStatus.NO_EXPIRY;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    if (target.getTime() < today.getTime()) {
      return ComplianceDocumentStatus.EXPIRED;
    }

    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= EXPIRING_SOON_DAYS) {
      return ComplianceDocumentStatus.EXPIRING;
    }

    return ComplianceDocumentStatus.VALID;
  }

  private parseNullableDate(value?: string | null) {
    if (!value || !value.trim()) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date: ${value}`);
    }

    return date;
  }

  private cleanString(value?: string | null) {
    if (typeof value === 'undefined') {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private normaliseRegistration(value: string) {
    return value.trim().toUpperCase();
  }

  private normaliseCapacity(value?: number | null) {
    if (typeof value === 'undefined') {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (!Number.isFinite(value) || value <= 0) {
      return 4;
    }

    return Math.floor(value);
  }

  private normaliseVehicleStatus(value?: string | null) {
    if (!value || !value.trim()) {
      return 'ACTIVE';
    }

    const normalised = value.trim().toUpperCase();

    if (!['ACTIVE', 'INACTIVE', 'OFF_ROAD'].includes(normalised)) {
      throw new BadRequestException(
        'Vehicle status must be ACTIVE, INACTIVE, or OFF_ROAD',
      );
    }

    return normalised;
  }

  private async ensureDriverBelongsToCompany(
    driverId: string,
    companyId: string,
  ) {
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

  private async ensureVehicleRegUnique(input: {
    companyId: string;
    reg: string;
    excludeVehicleId?: string;
  }) {
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        companyId: input.companyId,
        reg: input.reg,
        ...(input.excludeVehicleId
          ? {
              id: {
                not: input.excludeVehicleId,
              },
            }
          : {}),
      },
    });

    if (existing) {
      throw new BadRequestException(
        'A vehicle with that registration already exists',
      );
    }
  }
}