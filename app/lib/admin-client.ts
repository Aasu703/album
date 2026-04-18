import type { ApiResponse } from "@/app/lib/types";

export const ADMIN_AUTH_STORAGE_KEY = "adminAuth";
export const ADMIN_PASSWORD_STORAGE_KEY = "adminPassword";

/** Returns true when running in a browser context. */
function isBrowser() {
  return typeof window !== "undefined";
}

/** Reads the persisted admin password from localStorage. */
export function getStoredAdminPassword() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
}

/** Returns true when admin auth marker and password are present in localStorage. */
export function isAdminSessionActive() {
  if (!isBrowser()) {
    return false;
  }

  const authFlag = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  const password = getStoredAdminPassword();

  return authFlag === "true" && Boolean(password);
}

/** Persists admin auth marker and password for future API requests. */
export function persistAdminSession(password: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "true");
  window.localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, password);
}

/** Clears all persisted admin auth state from localStorage. */
export function clearAdminSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  window.localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
}

/** Builds request headers with persisted admin password when available. */
export function buildAdminHeaders(headersInit?: HeadersInit) {
  const headers = new Headers(headersInit);
  const password = getStoredAdminPassword();

  if (password) {
    headers.set("x-admin-password", password);
  }

  return headers;
}

/** Performs a typed admin API request and throws on non-success responses. */
export async function adminRequest<T>(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = buildAdminHeaders(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload || payload.error || payload.data === null) {
    throw new Error(payload?.error ?? `Request failed (${response.status}).`);
  }

  return payload.data;
}
