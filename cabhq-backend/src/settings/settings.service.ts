import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UpdateSettingsInput = {
  dispatchAutoRefreshSeconds?: number;
  driverTrackingIntervalSeconds?: number;
  autoDispatchEnabled?: boolean;
  autoDispatchOfferTimeoutSeconds?: number;
  allowManualDispatchOverride?: boolean;
  notifyDriversForNewJobs?: boolean;
  notifyOperatorsForCancelledJobs?: boolean;
  requireDriverPinLogin?: boolean;
  allowDriverShiftStartWithoutDocs?: boolean;
  defaultTimezone?: string;
  defaultCurrency?: string;
  defaultCountry?: string;
  bookingsRequireQuotedPrice?: boolean;
  bookingsRequirePassengerCount?: boolean;
  showCompletedJobsOnDispatch?: boolean;
  completedJobsCompactMode?: boolean;
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(companyId: string) {
    return this.prisma.companySettings.upsert({
      where: { companyId },
      update: {},
      create: { companyId },
    });
  }

  async update(companyId: string, input: UpdateSettingsInput) {
    return this.prisma.companySettings.upsert({
      where: { companyId },
      update: input,
      create: {
        companyId,
        ...input,
      },
    });
  }
}