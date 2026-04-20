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
  createdAt: string;
  updatedAt?: string | null;
  users?: CompanyUser[];
}