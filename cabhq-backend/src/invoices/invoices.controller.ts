import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

type AuthenticatedRequest = Request & {
  user: {
    sub?: string;
    id?: string;
    email?: string;
    role?: string;
    companyId?: string | null;
  };
};

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return this.invoicesService.list(req.user.companyId ?? '');
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(req.user.companyId ?? '', dto);
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(req.user.companyId ?? '', id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.invoicesService.updateStatus(
      req.user.companyId ?? '',
      id,
      body.status,
    );
  }

  @Delete(':id')
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.invoicesService.remove(req.user.companyId ?? '', id);
  }
}