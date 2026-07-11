"use client";

import { createContext, useContext, useEffect, useState } from "react";

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
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: RegisterInput) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Provides cookie-backed auth state for the marketplace app. */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
        const payload = (await response.json()) as { user: AuthUser | null };
        if (active) {
          setUser(payload.user);
        }
      } catch {
        // Leave user unauthenticated when the session check fails.
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string): Promise<AuthResult> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();

    if (response.ok && payload.success) {
      setUser(payload.user);
      return { success: true };
    }

    return { success: false, message: payload.message ?? "Login failed." };
  }

  async function register(data: RegisterInput): Promise<AuthResult> {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json();

    if (response.ok && payload.success) {
      return { success: true };
    }

    return { success: false, message: payload.message ?? "Registration failed." };
  }

  async function logout() {
    setUser(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clearing local state is still best-effort even if the request fails.
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
