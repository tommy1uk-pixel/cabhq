import type {
  BootstrapResponse,
  Driver,
  DriverLoginResponse,
  LocationPayload,
} from './driver-types';

export const DEFAULT_API_BASE_URL =
  'https://cabhq-production.up.railway.app';

export const DEFAULT_COMPANY_ID =
  'fb1239ad-b2bd-4458-b0c7-7e4bd213c837';

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function extractErrorMessage(data: unknown, fallback: string) {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const rawMessage = (data as { message?: unknown }).message;

    if (Array.isArray(rawMessage)) {
      return rawMessage.join(', ');
    }

    if (typeof rawMessage === 'string' && rawMessage.trim()) {
      return rawMessage;
    }
  }

  return fallback;
}

export async function apiFetch<T>(
  baseUrl: string,
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/')
    ? path
    : `/${path}`;

  const headers = new Headers(options?.headers || {});

  headers.set('Authorization', `Bearer ${token}`);

  const isFormData =
    typeof FormData !== 'undefined' &&
    options?.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(
    `${normalizedBaseUrl}${normalizedPath}`,
    {
      ...options,
      headers,
    },
  );

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(
        data,
        `Request failed (${response.status})`,
      ),
    );
  }

  return data as T;
}

export async function loginDriver(
  baseUrl: string,
  username: string,
  pin: string,
): Promise<DriverLoginResponse> {
  const normalizedBaseUrl = baseUrl
    .trim()
    .replace(/\/+$/, '');

  const primaryResponse = await fetch(
    `${normalizedBaseUrl}/auth/driver-login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId: DEFAULT_COMPANY_ID,
        username: username.trim().toLowerCase(),
        pin: pin.trim(),
      }),
    },
  );

  const primaryData = await parseResponse(primaryResponse);

  if (primaryResponse.ok) {
    return primaryData as DriverLoginResponse;
  }

  const fallbackResponse = await fetch(
    `${normalizedBaseUrl}/driver-app/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: username.trim(),
        pin: pin.trim(),
      }),
    },
  );

  const fallbackData = await parseResponse(fallbackResponse);

  if (!fallbackResponse.ok) {
    throw new Error(
      extractErrorMessage(
        fallbackData,
        extractErrorMessage(
          primaryData,
          `Login failed (${primaryResponse.status})`,
        ),
      ),
    );
  }

  return fallbackData as DriverLoginResponse;
}

export async function bootstrapDriver(
  baseUrl: string,
  token: string,
) {
  return apiFetch<BootstrapResponse>(
    baseUrl,
    '/driver-app/me/bootstrap',
    token,
  );
}

export async function updateDriverLocation(
  baseUrl: string,
  token: string,
  coords: LocationPayload,
) {
  return apiFetch<{
    driver?: Driver;
    bootstrap?: BootstrapResponse;
    autoArrived?: {
      changed?: boolean;
      status?: string;
    };
  }>(
    baseUrl,
    '/driver-app/me/location',
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading: coords.heading ?? null,
        speed: coords.speed ?? null,
      }),
    },
  );
}