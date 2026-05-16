const FALLBACK_API_BASE = 'https://cabhq-production.up.railway.app';

function getApiBase() {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (envBase) {
    return envBase.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;

    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.')
    ) {
      return 'http://localhost:3002';
    }
  }

  return FALLBACK_API_BASE;
}

const API_BASE = getApiBase();

type ApiFetchOptions = {
  useDriverToken?: boolean;
  suppressAutoClear?: boolean;
  publicRequest?: boolean;
};

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

function getStoredToken(useDriverToken?: boolean): string | null {
  if (typeof window === 'undefined') return null;

  if (useDriverToken) {
    return localStorage.getItem('driverToken');
  }

  return localStorage.getItem('token') || localStorage.getItem('cabhq_token');
}

function clearStoredAuth(useDriverToken?: boolean): void {
  if (typeof window === 'undefined') return;

  if (useDriverToken) {
    localStorage.removeItem('driverToken');
    localStorage.removeItem('driver');
    return;
  }

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('cabhq_token');
  localStorage.removeItem('cabhq_user');
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(data: unknown) {
  if (!isApiErrorResponse(data)) return 'Request failed';

  if (Array.isArray(data.message)) {
    return data.message.join(', ');
  }

  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error;
  }

  return 'Request failed';
}

function buildUrl(path: string) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  options?: ApiFetchOptions,
): Promise<T> {
  const token = options?.publicRequest
    ? null
    : getStoredToken(options?.useDriverToken);

  const isFormData =
    typeof FormData !== 'undefined' && init.body instanceof FormData;

  const headers = new Headers(init.headers || {});

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') || '';
  let data: unknown = null;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    const message = getErrorMessage(data);

    if (
      !options?.publicRequest &&
      !options?.suppressAutoClear &&
      typeof window !== 'undefined' &&
      (response.status === 401 || response.status === 403)
    ) {
      clearStoredAuth(options?.useDriverToken);
    }

    throw new Error(message);
  }

  return data as T;
}

export function getApiBaseUrl() {
  return API_BASE;
}