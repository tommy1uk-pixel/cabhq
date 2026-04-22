export class CreateCompanyDto {
  name!: string;
  code?: string;
  slug?: string;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';

  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  timezone?: string;
  currency?: string;

  driverLimit?: number;
  vehicleLimit?: number;
  dispatcherSeatLimit?: number;

  billingPlan?: 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
  billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  trialEndsAt?: string;
  subscriptionStartsAt?: string;
  subscriptionEndsAt?: string;

  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
}