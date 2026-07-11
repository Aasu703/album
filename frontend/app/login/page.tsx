"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"initial" | "loading">("initial");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const result = await login(email, password);
    if (result.success) {
      router.push("/");
    } else {
      setError(result.message || "Login failed");
      setStatus("initial");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-white/50">Log in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/70">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#4D96FF]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#4D96FF]"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-full bg-[#4D96FF] py-3 font-semibold text-white transition hover:bg-[#3d85ee] disabled:opacity-50"
          >
            {status === "loading" ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="text-center text-sm text-white/50">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#4D96FF] hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
