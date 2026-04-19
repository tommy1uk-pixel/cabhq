import { Company } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch(`${API_BASE}/companies`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('fetchCompanies failed:', res.status, text);
    throw new Error(`Failed to fetch companies: ${res.status} ${text}`);
  }

  return res.json();
}

export async function fetchCompany(id: string): Promise<Company> {
  const res = await fetch(`${API_BASE}/companies/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('fetchCompany failed:', res.status, text);
    throw new Error(`Failed to fetch company: ${res.status} ${text}`);
  }

  return res.json();
}

export async function fetchBasicCompany(id: string): Promise<Company> {
  const companies = await fetchCompanies();
  const company = companies.find((item) => item.id === id);

  if (!company) {
    throw new Error('Company not found');
  }

  return company;
}