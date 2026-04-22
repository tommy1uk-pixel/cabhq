const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  'http://localhost:3002';

type ApiFetchOptions = {
  useDriverToken?: boolean;
  suppressAutoClear?: boolean;
};

type ApiErrorResponse = {
  message?: string | string[];
};

function getStoredToken(useDriverToken?: boolean): string | null {
  if (typeof window === 'undefined') return null;

  if (useDriverToken) {
    return localStorage.getItem('driverToken');
  }

  return (
    localStorage.getItem('token') ||
    localStorage.getItem('cabhq_token')
  );
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
  return typeof value === 'object' && value !== null && 'message' in value;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  options?: ApiFetchOptions,
): Promise<T> {
  const token = getStoredToken(options?.useDriverToken);
  const isFormData =
    typeof FormData !== 'undefined' && init.body instanceof FormData;

  const headers = new Headers(init.headers || {});

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') || '';
  let data: unknown = null;

  if (contentType.includes('application/json')) {
    data = (await response.json()) as unknown;
  } else {
    const text = await response.text();
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    let message = 'Request failed';

    if (isApiErrorResponse(data)) {
      if (Array.isArray(data.message)) {
        message = data.message.join(', ');
      } else if (typeof data.message === 'string' && data.message.trim()) {
        message = data.message;
      }
    }

    if (
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