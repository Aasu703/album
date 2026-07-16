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
    <header className="sticky top-0 z-40 border-b border-hairline bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
            <span aria-hidden="true">🛡️</span>
            Admin Console
          </Link>
          <Link href="/dashboard" className="text-sm font-semibold text-muted transition-colors duration-300 ease-out hover:text-accent">
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
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-300 ease-out ${
                  isActive ? "bg-accent text-background" : "text-muted hover:bg-surface hover:text-foreground"
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
