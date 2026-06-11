import { UserIdentity } from "@/app/lib/types";

export interface AuthState {
  user: UserIdentity | null;
  status: "initial" | "loading" | "authenticated" | "unauthenticated" | "error";
  error: string | null;
}

type AuthListener = (state: AuthState) => void;

class AuthCubit {
  private state: AuthState = {
    user: null,
    status: "initial",
    error: null,
  };

  private listeners: AuthListener[] = [];

  getState() {
    return this.state;
  }

  subscribe(listener: AuthListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(newState: Partial<AuthState>) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((l) => l(this.state));
  }

  async checkAuth() {
    this.emit({ status: "loading" });
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.user) {
        this.emit({ user: data.user, status: "authenticated", error: null });
      } else {
        this.emit({ user: null, status: "unauthenticated", error: null });
      }
    } catch (err) {
      this.emit({ status: "error", error: "Failed to check auth" });
    }
  }

  async login(email: string, password: string) {
    this.emit({ status: "loading" });
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        this.emit({ user: data.user, status: "authenticated", error: null });
        return true;
      } else {
        this.emit({ status: "error", error: data.message || "Login failed" });
        return false;
      }
    } catch (err) {
      this.emit({ status: "error", error: "Login failed" });
      return false;
    }
  }

  async register(data: any) {
    this.emit({ status: "loading" });
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await response.json();
      if (response.ok && payload.success) {
        // After register, we might want to login or just show success
        this.emit({ status: "unauthenticated", error: null });
        return true;
      } else {
        this.emit({ status: "error", error: payload.message || "Registration failed" });
        return false;
      }
    } catch (err) {
      this.emit({ status: "error", error: "Registration failed" });
      return false;
    }
  }

  async logout() {
    this.emit({ status: "loading" });
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      this.emit({ user: null, status: "unauthenticated", error: null });
    } catch (err) {
      this.emit({ status: "error", error: "Logout failed" });
    }
  }
}

export const authCubit = new AuthCubit();
