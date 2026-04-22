import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateAccountInput = {
  companyId: string;
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

type UpdateAccountInput = {
  accountId: string;
  companyId: string;
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

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.account.findMany({
      where: { companyId },
      include: {
        bookings: {
          select: {
            id: true,
            reference: true,
            status: true,
            pickupTime: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            paidAmount: true,
            balanceDue: true,
            issueDate: true,
            dueDate: true,
          },
          orderBy: { issueDate: 'desc' },
        },
        payments: {
          select: {
            id: true,
            reference: true,
            status: true,
            amount: true,
            allocatedAmount: true,
            unallocatedAmount: true,
            paymentDate: true,
          },
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  async findOne(accountId: string, companyId: string) {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
      },
      include: {
        bookings: {
          select: {
            id: true,
            reference: true,
            status: true,
            pickup: true,
            dropoff: true,
            pickupTime: true,
            quotedPrice: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            subtotal: true,
            vat: true,
            total: true,
            paidAmount: true,
            balanceDue: true,
            issueDate: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: { issueDate: 'desc' },
        },
        payments: {
          select: {
            id: true,
            reference: true,
            status: true,
            method: true,
            amount: true,
            allocatedAmount: true,
            unallocatedAmount: true,
            paymentDate: true,
            createdAt: true,
          },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async create(input: CreateAccountInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('Account name is required');
    }

    const code = input.code?.trim() || null;

    if (code) {
      const codeConflict = await this.prisma.account.findFirst({
        where: {
          companyId: input.companyId,
          code,
        },
        select: { id: true },
      });

      if (codeConflict) {
        throw new BadRequestException('Account code already exists');
      }
    }

    const nameConflict = await this.prisma.account.findFirst({
      where: {
        companyId: input.companyId,
        name,
      },
      select: { id: true },
    });

    if (nameConflict) {
      throw new BadRequestException('Account name already exists');
    }

    return this.prisma.account.create({
      data: {
        companyId: input.companyId,
        name,
        code,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        contactName: input.contactName?.trim() || null,
        address1: input.address1?.trim() || null,
        address2: input.address2?.trim() || null,
        city: input.city?.trim() || null,
        postcode: input.postcode?.trim() || null,
        vatNumber: input.vatNumber?.trim() || null,
        paymentTerms: input.paymentTerms ?? 30,
        creditLimit: input.creditLimit ?? 0,
        status: input.status?.trim() || 'ACTIVE',
        notes: input.notes?.trim() || null,
      },
      include: {
        bookings: {
          select: {
            id: true,
            reference: true,
            status: true,
            pickupTime: true,
            createdAt: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            paidAmount: true,
            balanceDue: true,
            issueDate: true,
            dueDate: true,
          },
        },
        payments: {
          select: {
            id: true,
            reference: true,
            status: true,
            amount: true,
            allocatedAmount: true,
            unallocatedAmount: true,
            paymentDate: true,
          },
        },
      },
    });
  }

  async update(input: UpdateAccountInput) {
    const existing = await this.prisma.account.findFirst({
      where: {
        id: input.accountId,
        companyId: input.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    const nextName = input.name?.trim();
    const nextCode =
      input.code === undefined ? undefined : input.code?.trim() || null;

    if (nextName) {
      const nameConflict = await this.prisma.account.findFirst({
        where: {
          companyId: input.companyId,
          name: nextName,
          NOT: { id: input.accountId },
        },
        select: { id: true },
      });

      if (nameConflict) {
        throw new BadRequestException('Account name already exists');
      }
    }

    if (nextCode) {
      const codeConflict = await this.prisma.account.findFirst({
        where: {
          companyId: input.companyId,
          code: nextCode,
          NOT: { id: input.accountId },
        },
        select: { id: true },
      });

      if (codeConflict) {
        throw new BadRequestException('Account code already exists');
      }
    }

    return this.prisma.account.update({
      where: { id: input.accountId },
      data: {
        name: nextName ?? existing.name,
        code: nextCode === undefined ? existing.code : nextCode,
        email:
          input.email === undefined ? existing.email : input.email?.trim() || null,
        phone:
          input.phone === undefined ? existing.phone : input.phone?.trim() || null,
        contactName:
          input.contactName === undefined
            ? existing.contactName
            : input.contactName?.trim() || null,
        address1:
          input.address1 === undefined
            ? existing.address1
            : input.address1?.trim() || null,
        address2:
          input.address2 === undefined
            ? existing.address2
            : input.address2?.trim() || null,
        city: input.city === undefined ? existing.city : input.city?.trim() || null,
        postcode:
          input.postcode === undefined
            ? existing.postcode
            : input.postcode?.trim() || null,
        vatNumber:
          input.vatNumber === undefined
            ? existing.vatNumber
            : input.vatNumber?.trim() || null,
        paymentTerms:
          input.paymentTerms === undefined
            ? existing.paymentTerms
            : input.paymentTerms ?? 30,
        creditLimit:
          input.creditLimit === undefined
            ? existing.creditLimit
            : input.creditLimit ?? 0,
        status:
          input.status === undefined ? existing.status : input.status?.trim() || 'ACTIVE',
        notes:
          input.notes === undefined ? existing.notes : input.notes?.trim() || null,
      },
      include: {
        bookings: {
          select: {
            id: true,
            reference: true,
            status: true,
            pickupTime: true,
            createdAt: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            paidAmount: true,
            balanceDue: true,
            issueDate: true,
            dueDate: true,
          },
        },
        payments: {
          select: {
            id: true,
            reference: true,
            status: true,
            amount: true,
            allocatedAmount: true,
            unallocatedAmount: true,
            paymentDate: true,
          },
        },
      },
    });
  }

  async remove(accountId: string, companyId: string) {
    const existing = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
      },
      select: {
        id: true,
        _count: {
          select: {
            bookings: true,
            invoices: true,
            payments: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    if (
      existing._count.bookings > 0 ||
      existing._count.invoices > 0 ||
      existing._count.payments > 0
    ) {
      throw new BadRequestException(
        'Cannot delete account with linked bookings, invoices or payments',
      );
    }

    await this.prisma.account.delete({
      where: { id: accountId },
    });

    return { success: true };
  }
}