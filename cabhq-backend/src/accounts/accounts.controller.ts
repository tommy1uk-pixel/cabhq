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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountsService } from './accounts.service';

type AuthRequest = {
  user: {
    sub: string;
    companyId: string;
    email?: string;
    role?: string;
  };
};

type CreateAccountBody = {
  name: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  postcode?: string | null;
  vatNumber?: string | null;
  paymentTerms?: number | null;
  creditLimit?: number | null;
  status?: string | null;
  notes?: string | null;
};

type UpdateAccountBody = {
  name?: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  postcode?: string | null;
  vatNumber?: string | null;
  paymentTerms?: number | null;
  creditLimit?: number | null;
  status?: string | null;
  notes?: string | null;
};

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    return this.accountsService.list(req.user.companyId);
  }

  @Get(':id')
  async getOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.accountsService.findOne(id, req.user.companyId);
  }

  @Post()
  async create(@Req() req: AuthRequest, @Body() body: CreateAccountBody) {
    return this.accountsService.create({
      companyId: req.user.companyId,
      name: body.name,
      code: body.code ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      contactName: body.contactName ?? null,
      address1: body.address1 ?? null,
      address2: body.address2 ?? null,
      city: body.city ?? null,
      postcode: body.postcode ?? null,
      vatNumber: body.vatNumber ?? null,
      paymentTerms: body.paymentTerms ?? null,
      creditLimit: body.creditLimit ?? null,
      status: body.status ?? null,
      notes: body.notes ?? null,
    });
  }

  @Patch(':id')
  async update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: UpdateAccountBody,
  ) {
    return this.accountsService.update({
      accountId: id,
      companyId: req.user.companyId,
      name: body.name,
      code: body.code,
      email: body.email,
      phone: body.phone,
      contactName: body.contactName,
      address1: body.address1,
      address2: body.address2,
      city: body.city,
      postcode: body.postcode,
      vatNumber: body.vatNumber,
      paymentTerms: body.paymentTerms,
      creditLimit: body.creditLimit,
      status: body.status,
      notes: body.notes,
    });
  }

  @Delete(':id')
  async remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.accountsService.remove(id, req.user.companyId);
  }
}