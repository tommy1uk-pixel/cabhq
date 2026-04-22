import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.invoice.findMany({
      where: { companyId },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(companyId: string, dto: CreateInvoiceDto) {
    const subtotal = Number(dto.subtotal || 0);
    const vat = Number(dto.vat || 0);
    const total = subtotal + vat;

    const count = await this.prisma.invoice.count({
      where: { companyId },
    });

    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber,
        accountName: dto.accountName.trim(),
        status: 'DRAFT',
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
        tripCount: Number(dto.tripCount || 0),
        subtotal,
        vat,
        total,
        paidAmount: 0,
        balanceDue: total,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async update(companyId: string, invoiceId: string, dto: UpdateInvoiceDto) {
    const existing = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    const subtotal =
      dto.subtotal != null ? Number(dto.subtotal) : existing.subtotal;
    const vat = dto.vat != null ? Number(dto.vat) : existing.vat;
    const total = subtotal + vat;
    const balanceDue = Math.max(total - existing.paidAmount, 0);

    return this.prisma.invoice.update({
      where: { id: existing.id },
      data: {
        accountName: dto.accountName?.trim() ?? existing.accountName,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : existing.issueDate,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : existing.dueDate,
        tripCount:
          dto.tripCount != null ? Number(dto.tripCount) : existing.tripCount,
        subtotal,
        vat,
        total,
        balanceDue,
        notes:
          dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes,
      },
    });
  }

  async updateStatus(companyId: string, invoiceId: string, status: string) {
    const existing = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    if (status === 'PAID') {
      return this.prisma.invoice.update({
        where: { id: existing.id },
        data: {
          status,
          paidAmount: existing.total,
          balanceDue: 0,
        },
      });
    }

    return this.prisma.invoice.update({
      where: { id: existing.id },
      data: {
        status,
        balanceDue: Math.max(existing.total - existing.paidAmount, 0),
      },
    });
  }

  async remove(companyId: string, invoiceId: string) {
    const existing = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    await this.prisma.invoice.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }
}