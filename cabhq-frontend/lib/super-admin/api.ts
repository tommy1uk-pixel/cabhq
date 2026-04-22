import { Company } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  'http://localhost:3002';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cabhq_token');
}

export async function fetchCompanies(): Promise<Company[]> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/companies`, {
    method: 'GET',
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
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
  const token = getToken();

  const res = await fetch(`${API_BASE}/companies/${id}`, {
    method: 'GET',
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
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