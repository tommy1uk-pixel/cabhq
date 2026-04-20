export type AuthUser = {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'DRIVER';
  companyId?: string;
};

export function getDefaultRouteForRole(role?: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin';
    case 'ADMIN':
    case 'OPERATOR':
      return '/dashboard';
    case 'DRIVER':
      return '/driver';
    default:
      return '/login';
  }
}

export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const decoded =
      typeof window === 'undefined'
        ? Buffer.from(payload, 'base64').toString('utf8')
        : atob(payload);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string) {
  document.cookie = `cabhq_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

export function clearAuthCookie() {
  document.cookie =
    'cabhq_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax';
}

export function getTokenFromDocumentCookie() {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(
    /(?:^|;\s*)cabhq_token=([^;]+)/,
  );

  return match ? decodeURIComponent(match[1]) : null;
}