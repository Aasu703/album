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
          <span className="text-lg font-bold text-white tracking-tight">Painting Gallery</span>
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
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-white transition hover:text-indigo-400"
          >
            <span aria-hidden="true">🎨</span>
            Painting Gallery
          </Link>
          <Link
            href="/paintings"
            className="hidden text-sm font-semibold text-gray-400 transition hover:text-indigo-400 sm:inline"
          >
            Browse
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              {user.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className="hidden text-sm font-semibold text-gray-400 transition hover:text-indigo-400 sm:inline"
                >
                  Admin
                </Link>
              ) : null}
              <Link href="/dashboard" className="flex items-center gap-2">
                <Avatar name={displayName} color={generateAvatarColor(user.email)} size="sm" />
              </Link>
              <span className="hidden max-w-32 truncate text-sm font-semibold text-white sm:inline">
                {displayName}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="min-h-10 rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:border-indigo-500 hover:text-indigo-400"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="min-h-10 rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-indigo-500 hover:text-indigo-400"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="min-h-10 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
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
