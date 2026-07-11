"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Avatar from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { generateAvatarColor } from "@/lib/avatar";

/** Renders the main app navigation with auth-aware actions. */
export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (pathname === "/") {
    return (
      <header className="absolute top-0 left-0 right-0 z-10 flex h-16 items-center justify-between px-6 bg-transparent">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xl">🎨</span>
          <span className="text-lg font-bold text-white tracking-tight">Painting Marketplace</span>
        </Link>
        <div className="flex items-center gap-6">
          {user ? (
            <Link href="/dashboard" className="text-sm font-medium text-white hover:text-white/80 transition-colors">
              {user.firstName}
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-white hover:text-white/80 transition-colors">
                Log in
              </Link>
              <Link href="/register" className="text-sm font-medium text-white hover:text-white/80 transition-colors">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>
    );
  }

  const displayName = user ? `${user.firstName} ${user.lastName}` : "";

  return (
    <header className="sticky top-0 z-40 border-b border-[#E9ECEF] bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-[#1A1A2E] transition hover:text-[#4D96FF]"
        >
          <span aria-hidden="true">🎨</span>
          Painting Marketplace
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Avatar name={displayName} color={generateAvatarColor(user.email)} size="sm" />
              </Link>
              <span className="hidden max-w-32 truncate text-sm font-semibold text-[#1A1A2E] sm:inline">
                {displayName}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="min-h-10 rounded-full border border-[#E9ECEF] bg-white px-3 py-1.5 text-sm font-semibold text-[#1A1A2E] shadow-sm transition hover:border-[#4D96FF] hover:text-[#4D96FF]"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="min-h-10 rounded-full border border-[#E9ECEF] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A2E] shadow-sm transition hover:border-[#4D96FF] hover:text-[#4D96FF]"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="min-h-10 rounded-full bg-[#4D96FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
