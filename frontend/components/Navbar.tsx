"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Avatar from "@/components/Avatar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthProvider";
import { generateAvatarColor } from "@/lib/avatar";

/** Renders the main app navigation with auth-aware actions. */
export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (pathname === "/") {
    // The landing hero is always dark (see HeroSection), so this transparent
    // nav overlays it in a fixed dark scope regardless of the app theme.
    return (
      <header className="dark absolute top-0 left-0 right-0 z-10 flex h-16 items-center justify-between px-6 bg-transparent">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xl">🎨</span>
          <span className="font-serif text-lg font-semibold tracking-tight text-foreground">Painting Gallery</span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard" className="text-sm font-medium text-foreground transition-colors duration-300 ease-out hover:text-accent">
              {user.firstName}
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-foreground transition-colors duration-300 ease-out hover:text-accent">
                Log in
              </Link>
              <Link href="/register" className="text-sm font-medium text-foreground transition-colors duration-300 ease-out hover:text-accent">
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
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/95 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-foreground transition-colors duration-300 ease-out hover:text-accent"
          >
            <span aria-hidden="true">🎨</span>
            Painting Gallery
          </Link>
          <Link
            href="/paintings"
            className="hidden text-sm font-semibold text-muted transition-colors duration-300 ease-out hover:text-accent sm:inline"
          >
            Browse
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              {user.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className="hidden text-sm font-semibold text-muted transition-colors duration-300 ease-out hover:text-accent sm:inline"
                >
                  Admin
                </Link>
              ) : null}
              {user.role !== "ADMIN" ? (
                <Link
                  href="/upload"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background shadow-sm transition-colors duration-300 ease-out hover:bg-accent-hover"
                >
                  <span aria-hidden="true" className="text-base leading-none">＋</span>
                  <span className="hidden sm:inline">Create</span>
                </Link>
              ) : null}
              <Link href="/dashboard" className="flex items-center gap-2">
                <Avatar name={displayName} color={generateAvatarColor(user.email)} size="sm" />
              </Link>
              <span className="hidden max-w-32 truncate text-sm font-semibold text-foreground sm:inline">
                {displayName}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="min-h-10 rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="min-h-10 rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="min-h-10 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background shadow-sm transition-colors duration-300 ease-out hover:bg-accent-hover"
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
