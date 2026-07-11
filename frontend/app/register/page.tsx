"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const { register } = useAuth();
  const [status, setStatus] = useState<"initial" | "loading">("initial");
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    Firstname: "",
    Lastname: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const result = await register(formData);
    if (result.success) {
      router.push("/login");
    } else {
      setError(result.message || "Registration failed");
      setStatus("initial");
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="mt-2 text-white/50">Join us and start sharing memories</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-white/70">First Name</label>
              <input
                name="Firstname"
                required
                value={formData.Firstname}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#4D96FF]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">Last Name</label>
              <input
                name="Lastname"
                required
                value={formData.Lastname}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#4D96FF]"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-white/70">Email</label>
            <input
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#4D96FF]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/70">Phone (Optional)</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#4D96FF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-white/70">Password</label>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#4D96FF]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">Confirm</label>
              <input
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#4D96FF]"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-full bg-[#4D96FF] py-3 font-semibold text-white transition hover:bg-[#3d85ee] disabled:opacity-50"
          >
            {status === "loading" ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link href="/login" className="text-[#4D96FF] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
