import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DriversService } from './drivers.service';

type AuthRequest = {
  user: {
    sub: string;
    companyId: string;
    email?: string;
    role?: string;
  };
};

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

type CreateDriverBody = {
  name: string;
  phone?: string | null;
  email?: string | null;
  pin: string;
  licenceNumber?: string | null;
  badgeExpiry?: string | null;
  dbsExpiry?: string | null;
  licenceExpiry?: string | null;
};

type UpdateDriverBody = {
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

type UpdateDriverLocationBody = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
};

type UploadDriverDocumentBody = {
  documentType: string;
  title?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  dbsUpdateServiceEnabled?: string;
  dbsUpdateServiceReference?: string;
  dbsUpdateServiceCheckedAt?: string;
};

function ensureDriverUploadPath(driverId: string) {
  const uploadPath = join(process.cwd(), 'uploads', 'drivers', driverId);

  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
  }

  return uploadPath;
}

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    return this.driversService.list(req.user.companyId);
  }

  @Get(':id')
  async getOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.driversService.findOne(id, req.user.companyId);
  }

  @Post()
  async create(@Req() req: AuthRequest, @Body() body: CreateDriverBody) {
    return this.driversService.create({
      companyId: req.user.companyId,
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      pin: body.pin,
      licenceNumber: body.licenceNumber ?? null,
      badgeExpiry: body.badgeExpiry ?? null,
      dbsExpiry: body.dbsExpiry ?? null,
      licenceExpiry: body.licenceExpiry ?? null,
    });
  }

  @Patch(':id')
  async update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: UpdateDriverBody,
  ) {
    return this.driversService.update({
      driverId: id,
      companyId: req.user.companyId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      pin: body.pin,
      status: body.status,
      licenceNumber: body.licenceNumber,
      badgeExpiry: body.badgeExpiry,
      dbsExpiry: body.dbsExpiry,
      licenceExpiry: body.licenceExpiry,
    });
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.driversService.updateStatus({
      driverId: id,
      companyId: req.user.companyId,
      status: body.status,
    });
  }

  @Post(':id/location')
  async updateLocation(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: UpdateDriverLocationBody,
  ) {
    return this.driversService.updateLocation({
      driverId: id,
      companyId: req.user.companyId,
      latitude: body.latitude,
      longitude: body.longitude,
      heading: body.heading ?? null,
      speed: body.speed ?? null,
    });
  }

  @Post(':id/start-shift')
  async startShift(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.driversService.startShift(id, req.user.companyId);
  }

  @Post(':id/end-shift')
  async endShift(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.driversService.endShift(id, req.user.companyId);
  }

  @Get(':id/shifts')
  async getShiftHistory(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.driversService.getShiftHistory(id, req.user.companyId);
  }

  @Delete(':id')
  async remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.driversService.remove(id, req.user.companyId);
  }

  @Get(':id/documents')
  async listDocuments(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.driversService.listDocuments(id, req.user.companyId);
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (
          req: Request & { params: { id: string } },
          _file,
          cb,
        ) => {
          cb(null, ensureDriverUploadPath(req.params.id));
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadDocument(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @UploadedFile() file: UploadedMulterFile,
    @Body() body: UploadDriverDocumentBody,
  ) {
    return this.driversService.uploadDocument({
      driverId: id,
      companyId: req.user.companyId,
      file,
      documentType: body.documentType,
      title: body.title,
      issueDate: body.issueDate,
      expiryDate: body.expiryDate,
      notes: body.notes,
      dbsUpdateServiceEnabled: body.dbsUpdateServiceEnabled,
      dbsUpdateServiceReference: body.dbsUpdateServiceReference,
      dbsUpdateServiceCheckedAt: body.dbsUpdateServiceCheckedAt,
    });
  }

  @Delete(':driverId/documents/:documentId')
  async deleteDocument(
    @Req() req: AuthRequest,
    @Param('driverId') driverId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.driversService.deleteDocument({
      driverId,
      documentId,
      companyId: req.user.companyId,
    });
  }
}