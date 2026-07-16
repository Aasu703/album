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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshUser() {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.data.user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    // Mount-time session bootstrap: read the httpOnly-cookie session from the API and
    // reflect it into React state. This is a valid effect (syncing from an external
    // system), and the setState runs after the async request resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUser().finally(() => setIsLoading(false));
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
