const API_BASE_URL = window.location.origin;

function getCookieValue(name: string): string {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}

export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const businessId = localStorage.getItem('businessId');
  if (businessId) headers['X-Business-Id'] = businessId;
  const csrfToken = getCookieValue('rx_csrf_token');
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return headers;
}

export async function readResponsePayload(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

export function getErrorMessage(payload: Record<string, unknown> | null, fallback = 'Request failed'): string {
  if (!payload) return fallback;
  if (typeof payload.detail === 'string') return payload.detail;
  if (payload.detail && typeof (payload.detail as Record<string, unknown>).message === 'string')
    return (payload.detail as Record<string, unknown>).message as string;
  if (typeof payload.message === 'string') return payload.message;
  return fallback;
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export async function authedRequest<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: apiHeaders((options.headers as Record<string, string>) || {}),
  });

  const payload = await readResponsePayload(response);

  if (response.status === 401) {
    onUnauthorized?.();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Request failed'));
  }

  return payload as T;
}

export async function publicRequest<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {}
): Promise<{ response: Response; data: T }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) },
  });
  const data = await readResponsePayload(response);
  return { response, data: data as T };
}
