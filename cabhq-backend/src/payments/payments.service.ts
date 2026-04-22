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
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            balanceDue: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            contactName: true,
            paymentTerms: true,
            status: true,
          },
        },
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });

    return payments.map((payment) => ({
      id: payment.id,
      reference: payment.reference,
      accountId: payment.accountId,
      accountName: payment.accountName,
      invoiceNumber: payment.invoice?.invoiceNumber ?? null,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      allocatedAmount: payment.allocatedAmount,
      unallocatedAmount: payment.unallocatedAmount,
      notes: payment.notes,
      account: payment.account
        ? {
            id: payment.account.id,
            name: payment.account.name,
            code: payment.account.code,
            email: payment.account.email,
            contactName: payment.account.contactName,
            paymentTerms: payment.account.paymentTerms,
            status: payment.account.status,
          }
        : null,
      invoice: payment.invoice
        ? {
            id: payment.invoice.id,
            invoiceNumber: payment.invoice.invoiceNumber,
            status: payment.invoice.status,
            total: payment.invoice.total,
            balanceDue: payment.invoice.balanceDue,
          }
        : null,
    }));
  }

  async create(companyId: string, dto: CreatePaymentDto) {
    let invoice = dto.invoiceNumber
      ? await this.prisma.invoice.findFirst({
          where: {
            companyId,
            invoiceNumber: dto.invoiceNumber,
          },
        })
      : null;

    let accountId: string | null = null;
    let accountName = dto.accountName?.trim() || '';

    if ((dto as any).accountId) {
      const account = await this.prisma.account.findFirst({
        where: {
          id: (dto as any).accountId,
          companyId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!account) {
        throw new NotFoundException('Account not found');
      }

      accountId = account.id;
      accountName = account.name;
    } else if (invoice?.accountId) {
      const invoiceAccount = await this.prisma.account.findFirst({
        where: {
          id: invoice.accountId,
          companyId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (invoiceAccount) {
        accountId = invoiceAccount.id;
        accountName = invoiceAccount.name;
      }
    }

    if (!accountName) {
      throw new NotFoundException('Account name is required');
    }

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
        accountId,
        accountName,
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
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            balanceDue: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            contactName: true,
            paymentTerms: true,
            status: true,
          },
        },
      },
    });

    if (invoice?.id) {
      await this.syncInvoiceTotals(invoice.id);
    }

    return {
      id: payment.id,
      reference: payment.reference,
      accountId: payment.accountId,
      accountName: payment.accountName,
      invoiceNumber: payment.invoice?.invoiceNumber ?? null,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      allocatedAmount: payment.allocatedAmount,
      unallocatedAmount: payment.unallocatedAmount,
      notes: payment.notes,
      account: payment.account
        ? {
            id: payment.account.id,
            name: payment.account.name,
            code: payment.account.code,
            email: payment.account.email,
            contactName: payment.account.contactName,
            paymentTerms: payment.account.paymentTerms,
            status: payment.account.status,
          }
        : null,
      invoice: payment.invoice
        ? {
            id: payment.invoice.id,
            invoiceNumber: payment.invoice.invoiceNumber,
            status: payment.invoice.status,
            total: payment.invoice.total,
            balanceDue: payment.invoice.balanceDue,
          }
        : null,
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
        account: true,
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

    let accountId = existing.accountId;
    let accountName = existing.accountName;

    if ((dto as any).accountId !== undefined) {
      if ((dto as any).accountId) {
        const account = await this.prisma.account.findFirst({
          where: {
            id: (dto as any).accountId,
            companyId,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (!account) {
          throw new NotFoundException('Account not found');
        }

        accountId = account.id;
        accountName = account.name;
      } else {
        accountId = null;
        if (dto.accountName?.trim()) {
          accountName = dto.accountName.trim();
        }
      }
    } else if (dto.accountName?.trim()) {
      accountName = dto.accountName.trim();
    } else if (nextInvoice?.accountId) {
      const invoiceAccount = await this.prisma.account.findFirst({
        where: {
          id: nextInvoice.accountId,
          companyId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (invoiceAccount) {
        accountId = invoiceAccount.id;
        accountName = invoiceAccount.name;
      }
    }

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
        accountId,
        accountName,
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
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            balanceDue: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            contactName: true,
            paymentTerms: true,
            status: true,
          },
        },
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
      accountId: updated.accountId,
      accountName: updated.accountName,
      invoiceNumber: updated.invoice?.invoiceNumber ?? null,
      method: updated.method,
      status: updated.status,
      amount: updated.amount,
      paymentDate: updated.paymentDate,
      allocatedAmount: updated.allocatedAmount,
      unallocatedAmount: updated.unallocatedAmount,
      notes: updated.notes,
      account: updated.account
        ? {
            id: updated.account.id,
            name: updated.account.name,
            code: updated.account.code,
            email: updated.account.email,
            contactName: updated.account.contactName,
            paymentTerms: updated.account.paymentTerms,
            status: updated.account.status,
          }
        : null,
      invoice: updated.invoice
        ? {
            id: updated.invoice.id,
            invoiceNumber: updated.invoice.invoiceNumber,
            status: updated.invoice.status,
            total: updated.invoice.total,
            balanceDue: updated.invoice.balanceDue,
          }
        : null,
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
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            balanceDue: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            contactName: true,
            paymentTerms: true,
            status: true,
          },
        },
      },
    });

    if (updated.invoiceId) {
      await this.syncInvoiceTotals(updated.invoiceId);
    }

    return {
      id: updated.id,
      reference: updated.reference,
      accountId: updated.accountId,
      accountName: updated.accountName,
      invoiceNumber: updated.invoice?.invoiceNumber ?? null,
      method: updated.method,
      status: updated.status,
      amount: updated.amount,
      paymentDate: updated.paymentDate,
      allocatedAmount: updated.allocatedAmount,
      unallocatedAmount: updated.unallocatedAmount,
      notes: updated.notes,
      account: updated.account
        ? {
            id: updated.account.id,
            name: updated.account.name,
            code: updated.account.code,
            email: updated.account.email,
            contactName: updated.account.contactName,
            paymentTerms: updated.account.paymentTerms,
            status: updated.account.status,
          }
        : null,
      invoice: updated.invoice
        ? {
            id: updated.invoice.id,
            invoiceNumber: updated.invoice.invoiceNumber,
            status: updated.invoice.status,
            total: updated.invoice.total,
            balanceDue: updated.invoice.balanceDue,
          }
        : null,
    };
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