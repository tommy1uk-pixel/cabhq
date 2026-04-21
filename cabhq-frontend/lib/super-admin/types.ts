export interface CompanyUser {
  id: string;
  email: string;
  role: string;
  status?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  code?: string | null;
  slug?: string | null;
  status?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  timezone?: string | null;
  currency?: string | null;
  driverLimit?: number | null;
  vehicleLimit?: number | null;
  dispatcherSeatLimit?: number | null;
  billingPlan?: 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE' | null;
  billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | null;
  trialEndsAt?: string | null;
  subscriptionStartsAt?: string | null;
  subscriptionEndsAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  users?: CompanyUser[];
}