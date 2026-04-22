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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehiclesService } from './vehicles.service';
import { VehicleDocumentType } from '@prisma/client';

type AuthRequest = {
  user: {
    sub: string;
    companyId: string;
    email?: string;
    role?: string;
  };
};

type CreateVehicleBody = {
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

type UpdateVehicleBody = {
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

type AssignDriverBody = {
  driverId: string | null;
};

type UpdateVehicleStatusBody = {
  status: string;
};

type UploadVehicleDocumentBody = {
  documentType: VehicleDocumentType;
  title: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
};

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    return this.vehiclesService.list(req.user.companyId);
  }

  @Get('dashboard')
  async dashboard(@Req() req: AuthRequest) {
    return this.vehiclesService.getDashboard(req.user.companyId);
  }

  @Get(':id')
  async getOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.vehiclesService.getOne(id, req.user.companyId);
  }

  @Post()
  async create(@Req() req: AuthRequest, @Body() body: CreateVehicleBody) {
    return this.vehiclesService.create({
      companyId: req.user.companyId,
      reg: body.reg,
      make: body.make ?? null,
      model: body.model ?? null,
      colour: body.colour ?? null,
      capacity: body.capacity ?? null,
      status: body.status ?? null,
      plateNumber: body.plateNumber ?? null,
      vin: body.vin ?? null,
      motExpiry: body.motExpiry ?? null,
      insuranceExpiry: body.insuranceExpiry ?? null,
      inspectionExpiry: body.inspectionExpiry ?? null,
      vehicleLicenceExpiry: body.vehicleLicenceExpiry ?? null,
      taxExpiry: body.taxExpiry ?? null,
      serviceDate: body.serviceDate ?? null,
      notes: body.notes ?? null,
      driverId: body.driverId ?? null,
    });
  }

  @Patch(':id')
  async update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: UpdateVehicleBody,
  ) {
    return this.vehiclesService.update({
      vehicleId: id,
      companyId: req.user.companyId,
      reg: body.reg,
      make: body.make,
      model: body.model,
      colour: body.colour,
      capacity: body.capacity,
      status: body.status,
      plateNumber: body.plateNumber,
      vin: body.vin,
      motExpiry: body.motExpiry,
      insuranceExpiry: body.insuranceExpiry,
      inspectionExpiry: body.inspectionExpiry,
      vehicleLicenceExpiry: body.vehicleLicenceExpiry,
      taxExpiry: body.taxExpiry,
      serviceDate: body.serviceDate,
      notes: body.notes,
      driverId: body.driverId,
    });
  }

  @Post(':id/assign-driver')
  async assignDriver(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: AssignDriverBody,
  ) {
    return this.vehiclesService.assignDriver({
      vehicleId: id,
      driverId: body.driverId,
      companyId: req.user.companyId,
    });
  }

  @Post(':id/unassign-driver')
  async unassignDriver(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.vehiclesService.assignDriver({
      vehicleId: id,
      driverId: null,
      companyId: req.user.companyId,
    });
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: UpdateVehicleStatusBody,
  ) {
    return this.vehiclesService.updateStatus({
      vehicleId: id,
      companyId: req.user.companyId,
      status: body.status,
    });
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: UploadVehicleDocumentBody,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.vehiclesService.uploadDocument({
      vehicleId: id,
      companyId: req.user.companyId,
      documentType: body.documentType,
      title: body.title,
      issueDate: body.issueDate ?? null,
      expiryDate: body.expiryDate ?? null,
      notes: body.notes ?? null,
      file,
    });
  }

  @Delete(':vehicleId/documents/:documentId')
  async removeDocument(
    @Req() req: AuthRequest,
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.vehiclesService.removeDocument({
      vehicleId,
      documentId,
      companyId: req.user.companyId,
    });
  }

  @Delete(':id')
  async remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.vehiclesService.remove(id, req.user.companyId);
  }
}