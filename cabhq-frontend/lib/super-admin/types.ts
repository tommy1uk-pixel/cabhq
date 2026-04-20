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
  createdAt: string;
  users?: CompanyUser[];
}