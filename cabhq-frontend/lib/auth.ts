export type CabhqUser = {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'DRIVER';
  companyId: string;
};

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cabhq_token');
}

export function getStoredUser(): CabhqUser | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem('cabhq_user');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CabhqUser;
  } catch {
    return null;
  }
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cabhq_token');
  localStorage.removeItem('cabhq_user');
}