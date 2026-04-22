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
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

type AuthenticatedRequest = Request & {
  user: {
    sub?: string;
    id?: string;
    email?: string;
    role?: string;
    companyId?: string | null;
  };
};

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return this.paymentsService.list(req.user.companyId ?? '');
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(req.user.companyId ?? '', dto);
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(req.user.companyId ?? '', id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.paymentsService.updateStatus(
      req.user.companyId ?? '',
      id,
      body.status,
    );
  }

  @Delete(':id')
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.paymentsService.remove(req.user.companyId ?? '', id);
  }
}