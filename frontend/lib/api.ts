import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Task 1: Secure API Client Setup
// We configure Axios to ALWAYS send credentials (HttpOnly cookies) with every request.
// This ensures we never have to touch raw JWTs on the client-side or store them in localStorage,
// completely neutralizing traditional XSS token theft attacks.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Endpoints where a 401 is terminal — never try to refresh or retry these.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];
// Public routes where an expired session should NOT bounce the visitor to /login.
const PUBLIC_PATHS = ['/', '/login', '/register'];

// A single in-flight refresh shared across all concurrent 401s, so a burst of
// failing requests triggers exactly one call to /auth/refresh and the rest queue
// behind it instead of stampeding the endpoint.
let refreshPromise: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function isAuthEndpoint(url?: string): boolean {
  return !!url && AUTH_ENDPOINTS.some((path) => url.includes(path));
}

// On a 401 we assume the short-lived access token expired and transparently mint a
// fresh pair from the 30-day refresh cookie, then replay the original request. This
// keeps the user signed in for the full refresh window without re-entering credentials.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !isAuthEndpoint(original.url)) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        // Refresh failed → the session is genuinely over. Send the user to /login,
        // but never from a public page or from the silent /auth/me bootstrap (which
        // AuthProvider handles by simply clearing the in-memory user).
        if (
          typeof window !== 'undefined' &&
          !original.url?.includes('/auth/me') &&
          !PUBLIC_PATHS.includes(window.location.pathname)
        ) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);
