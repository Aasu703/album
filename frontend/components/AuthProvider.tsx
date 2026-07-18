"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { AuthUser } from "@/app/lib/types";

interface RegisterInput {
  Firstname: string;
  Lastname: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
  mfaRequired?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, mfaToken?: string) => Promise<AuthResult>;
  register: (data: RegisterInput) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Cache key for the last-known user PROFILE (never a token — the JWT stays in the
// httpOnly cookie). This is UI-only optimism: it lets the app render the signed-in
// state instantly on reload instead of flashing "logged out" while /auth/me resolves.
// The server still enforces every permission, so a stale/tampered value grants nothing.
const USER_CACHE_KEY = "album.user";

function readCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode, quota) — the app still works
    // without the optimistic cache, so this is best-effort only.
  }
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (typeof message === "string") {
      return message;
    }
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Provides auth state backed by NestJS httpOnly cookies (no client-side token handling). */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // Starts null to match the server-rendered HTML (there is no localStorage on the
  // server) — reading the cache here would break hydration. The mount effect below
  // hydrates from the cached profile immediately after, so the signed-in UI still
  // appears without waiting for /auth/me.
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Single writer for the user so React state and the localStorage cache never drift.
  function setUser(next: AuthUser | null) {
    setUserState(next);
    writeCachedUser(next);
  }

  async function refreshUser() {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.data.user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    // Post-hydration optimism: show the last-known signed-in state instantly from the
    // cache (this runs after hydration, so it can't cause a server/client mismatch).
    const cached = readCachedUser();
    if (cached) {
      setUserState(cached);
    }
    // Mount-time session bootstrap: read the httpOnly-cookie session from the API and
    // reflect it into React state, reconciling (or clearing) the optimistic cache above.
    void refreshUser().finally(() => setIsLoading(false));
    // Bootstrap must run exactly once on mount; refreshUser is intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string, mfaToken?: string): Promise<AuthResult> {
    try {
      const payload = mfaToken ? { email, password, mfaToken } : { email, password };
      const res = await api.post("/auth/login", payload);
      setUser(res.data.data.user);
      return { success: true };
    } catch (error) {
      const message = extractErrorMessage(error);
      const mfaRequired = message === "MFA token required.";
      return { success: false, message, mfaRequired };
    }
  }

  async function register(data: RegisterInput): Promise<AuthResult> {
    try {
      await api.post("/auth/register", data);
      return { success: true };
    } catch (error) {
      return { success: false, message: extractErrorMessage(error) };
    }
  }

  async function logout() {
    setUser(null);
    try {
      await api.post("/auth/logout");
    } catch {
      // Clearing local state is still best-effort even if the request fails.
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
