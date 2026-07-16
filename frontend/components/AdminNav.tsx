"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/AuthProvider";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/painters", label: "Painter applications" },
  { href: "/admin/users", label: "Manage users" },
];

/** Top navigation for the admin console. Redirects non-admins away. */
export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "ADMIN") {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 text-lg font-bold text-white">
            <span aria-hidden="true">🛡️</span>
            Admin Console
          </Link>
          <Link href="/dashboard" className="text-sm font-semibold text-gray-400 transition hover:text-indigo-400">
            Exit to site
          </Link>
        </div>
        <nav className="flex gap-1">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-900 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
