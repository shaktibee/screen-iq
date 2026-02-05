/**
 * API client: base URL from env, auth token and org id from localStorage (set on login).
 */
const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || '';

export function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  const orgId = localStorage.getItem('organizationId');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (orgId) headers['X-Organization-Id'] = orgId;
  return headers;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers as Record<string, string>) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || res.statusText || 'Request failed');
  }
  return data as T;
}

export async function apiBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: getAuthHeaders() as Record<string, string>,
  });
  if (!res.ok) throw new Error(res.statusText || 'Request failed');
  return res.blob();
}

