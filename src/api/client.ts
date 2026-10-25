// Same localStorage keys Dispatcharr's own web UI uses. This app is served from the same
// origin (under /m/), so signing in to either UI signs in to both.
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const EXPIRY_KEY = 'tokenExpiration'; // JWT `exp`, in seconds

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(describeError(status, body));
  }
}

function describeError(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.detail === 'string') return b.detail;
    if (typeof b.error === 'string') return b.error;
    if (typeof b.message === 'string') return b.message;
    // DRF field errors: { field: ["msg"] }
    const first = Object.entries(b)[0];
    if (first) return `${first[0]}: ${Array.isArray(first[1]) ? first[1].join(' ') : String(first[1])}`;
  }
  return `Request failed (${status})`;
}

function jwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).exp ?? null;
  } catch {
    return null;
  }
}

function storeTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  const exp = jwtExpiry(access);
  if (exp) localStorage.setItem(EXPIRY_KEY, String(exp));
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function hasSession() {
  return !!localStorage.getItem(REFRESH_KEY) || !!localStorage.getItem(ACCESS_KEY);
}

/** Fired when the session can't be refreshed, so the app can show the login screen. */
export const sessionEvents = new EventTarget();

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch('/api/accounts/token/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      storeTokens(data.access, data.refresh);
      return data.access as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** A valid access token, refreshing it first if it is about to expire. */
export async function accessToken(): Promise<string | null> {
  const access = localStorage.getItem(ACCESS_KEY);
  const exp = Number(localStorage.getItem(EXPIRY_KEY)) || (access ? jwtExpiry(access) : null);
  if (access && exp && Date.now() / 1000 < exp - 30) return access;
  return refreshAccessToken();
}

type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

export function withQuery(path: string, query?: Query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const send = async (token: string | null) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(withQuery(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  };

  let res = await send(await accessToken());
  if (res.status === 401) {
    const fresh = await refreshAccessToken();
    if (fresh) res = await send(fresh);
    if (res.status === 401) {
      clearTokens();
      sessionEvents.dispatchEvent(new Event('expired'));
    }
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export async function login(username: string, password: string) {
  const res = await fetch('/api/accounts/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  storeTokens(data.access, data.refresh);
}

export async function logout() {
  const refresh = localStorage.getItem(REFRESH_KEY);
  try {
    if (refresh) await api('/api/accounts/auth/logout/', { method: 'POST', body: { refresh } });
  } catch {
    // Signing out locally is what matters
  }
  clearTokens();
  sessionEvents.dispatchEvent(new Event('expired'));
}
