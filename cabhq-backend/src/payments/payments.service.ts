import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { companyId },
      include: {
        invoice: true,
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });

    return payments.map((payment) => ({
      id: payment.id,
      reference: payment.reference,
      accountName: payment.accountName,
      invoiceNumber: payment.invoice?.invoiceNumber ?? null,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      allocatedAmount: payment.allocatedAmount,
      unallocatedAmount: payment.unallocatedAmount,
      notes: payment.notes,
    }));
  }

  async create(companyId: string, dto: CreatePaymentDto) {
    const invoice = dto.invoiceNumber
      ? await this.prisma.invoice.findFirst({
          where: {
            companyId,
            invoiceNumber: dto.invoiceNumber,
          },
        })
      : null;

    const count = await this.prisma.payment.count({
      where: { companyId },
    });

    const year = new Date().getFullYear();
    const reference = `PAY-${year}-${String(count + 1).padStart(3, '0')}`;

    const amount = Number(dto.amount || 0);
    const allocatedAmount = Math.min(
      Math.max(Number(dto.allocatedAmount || 0), 0),
      amount,
    );
    const unallocatedAmount = Math.max(amount - allocatedAmount, 0);

    const payment = await this.prisma.payment.create({
      data: {
        companyId,
        reference,
        accountName: dto.accountName.trim(),
        invoiceId: invoice?.id ?? null,
        method: dto.method,
        status: dto.status,
        amount,
        paymentDate: new Date(dto.paymentDate),
        allocatedAmount,
        unallocatedAmount,
        notes: dto.notes?.trim() || null,
      },
      include: {
        invoice: true,
      },
    });

    if (invoice?.id) {
      await this.syncInvoiceTotals(invoice.id);
    }

    return {
      id: payment.id,
      reference: payment.reference,
      accountName: payment.accountName,
      invoiceNumber: payment.invoice?.invoiceNumber ?? null,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      allocatedAmount: payment.allocatedAmount,
      unallocatedAmount: payment.unallocatedAmount,
      notes: payment.notes,
    };
  }

  async update(companyId: string, paymentId: string, dto: UpdatePaymentDto) {
    const existing = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        companyId,
      },
      include: {
        invoice: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Payment not found');
    }

    const nextInvoice =
      dto.invoiceNumber !== undefined
        ? dto.invoiceNumber
          ? await this.prisma.invoice.findFirst({
              where: {
                companyId,
                invoiceNumber: dto.invoiceNumber,
              },
            })
          : null
        : existing.invoice;

    const amount = dto.amount != null ? Number(dto.amount) : existing.amount;
    const allocatedAmount = Math.min(
      Math.max(
        dto.allocatedAmount != null
          ? Number(dto.allocatedAmount)
          : existing.allocatedAmount,
        0,
      ),
      amount,
    );
    const unallocatedAmount = Math.max(amount - allocatedAmount, 0);

    const updated = await this.prisma.payment.update({
      where: { id: existing.id },
      data: {
        accountName: dto.accountName?.trim() ?? existing.accountName,
        invoiceId:
          dto.invoiceNumber !== undefined
            ? nextInvoice?.id ?? null
            : existing.invoiceId,
        method: dto.method ?? existing.method,
        status: dto.status ?? existing.status,
        amount,
        paymentDate: dto.paymentDate
          ? new Date(dto.paymentDate)
          : existing.paymentDate,
        allocatedAmount,
        unallocatedAmount,
        notes:
          dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes,
      },
      include: {
        invoice: true,
      },
    });

    if (existing.invoiceId) {
      await this.syncInvoiceTotals(existing.invoiceId);
    }

    if (updated.invoiceId && updated.invoiceId !== existing.invoiceId) {
      await this.syncInvoiceTotals(updated.invoiceId);
    }

    return {
      id: updated.id,
      reference: updated.reference,
      accountName: updated.accountName,
      invoiceNumber: updated.invoice?.invoiceNumber ?? null,
      method: updated.method,
      status: updated.status,
      amount: updated.amount,
      paymentDate: updated.paymentDate,
      allocatedAmount: updated.allocatedAmount,
      unallocatedAmount: updated.unallocatedAmount,
      notes: updated.notes,
    };
  }

  async updateStatus(companyId: string, paymentId: string, status: string) {
    const existing = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Payment not found');
    }

    const updated = await this.prisma.payment.update({
      where: { id: existing.id },
      data: { status },
    });

    if (updated.invoiceId) {
      await this.syncInvoiceTotals(updated.invoiceId);
    }

    return updated;
  }

  async remove(companyId: string, paymentId: string) {
    const existing = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Payment not found');
    }

    const invoiceId = existing.invoiceId;

    await this.prisma.payment.delete({
      where: { id: existing.id },
    });

    if (invoiceId) {
      await this.syncInvoiceTotals(invoiceId);
    }

    return { success: true };
  }

  private async syncInvoiceTotals(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
      },
    });

    if (!invoice) return;

    const paidAmount = invoice.payments.reduce((sum, payment) => {
      if (payment.status !== 'CLEARED') return sum;
      return sum + payment.allocatedAmount;
    }, 0);

    const balanceDue = Math.max(invoice.total - paidAmount, 0);

    let status = invoice.status;

    if (invoice.status !== 'VOID') {
      if (paidAmount <= 0) {
        status = 'SENT';
      } else if (balanceDue <= 0) {
        status = 'PAID';
      } else {
        status = 'PART_PAID';
      }
    }

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount,
        balanceDue,
        status,
      },
    });
  }
}