"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Avatar from "@/components/Avatar";
import { useIdentity } from "@/components/IdentityProvider";

const links = [
  { href: "/album", label: "Albums" },
];

/** Renders the main app navigation with identity-aware action buttons. */
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const { identity, clearIdentity, requestIdentity, openIdentityEditor } = useIdentity();

  const activeLinks = [...links];
  if (identity) {
    activeLinks.push({ href: `/album?user_id=${identity.id}`, label: "My Photos" });
  }
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isIdentityMenuOpen, setIsIdentityMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 20);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  async function handleProtectedNavigation(path: string) {
    const resolvedIdentity = await requestIdentity();
    if (!resolvedIdentity) {
      return;
    }

    router.push(path);
    setIsMenuOpen(false);
  }

  function handleChangeIdentity() {
    setIsIdentityMenuOpen(false);
    openIdentityEditor();
  }

  const displayName = identity?.name ?? "Guest";
  const displayEmail = identity?.email ?? null;
  const avatarColor = identity?.avatarColor ?? "#6C757D";

  if (currentPath === "/") {
    return (
      <header className="absolute top-0 left-0 right-0 z-10 flex h-16 items-center justify-between px-6 bg-transparent">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xl">📷</span>
          <span className="text-lg font-bold text-white tracking-tight">Album</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/album" className="text-sm font-medium text-white hover:text-white/80 transition-colors">Join</Link>
          <Link href="/album" className="text-sm font-medium text-white hover:text-white/80 transition-colors">Log in</Link>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`sticky top-0 z-40 border-b border-[#E9ECEF] bg-white/95 backdrop-blur transition-shadow ${
        isScrolled ? "shadow-sm" : ""
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/album"
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-[#1A1A2E] transition hover:text-[#4D96FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D96FF]"
          >
            <span aria-hidden="true">📷</span>
            Album
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {activeLinks.map((link) => {
              const isActive = currentPath.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`min-h-10 rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D96FF] ${
                    isActive ? "bg-[#F8F9FA] text-[#1A1A2E]" : "text-[#6C757D] hover:bg-[#F8F9FA] hover:text-[#1A1A2E]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => void handleProtectedNavigation("/upload")}
            className="min-h-11 rounded-full bg-[#4D96FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D96FF]"
          >
            Upload
          </button>

          <button
            type="button"
            onClick={() => void handleProtectedNavigation("/party/create")}
            className="min-h-11 rounded-full border border-[#E9ECEF] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A2E] shadow-sm transition hover:border-[#4D96FF] hover:text-[#4D96FF] hover:shadow-md active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D96FF]"
          >
            Create Party
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsIdentityMenuOpen((open) => !open)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E9ECEF] bg-white px-3 py-1.5 text-left text-sm text-[#1A1A2E] shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D96FF]"
            >
              <Avatar name={displayName} color={avatarColor} size="sm" />
              <span className="max-w-28 truncate font-semibold">{displayName}</span>
            </button>

            {isIdentityMenuOpen ? (
              <div className="absolute right-0 top-12 z-50 w-72 space-y-2 rounded-2xl border border-[#E9ECEF] bg-white p-3 shadow-md">
                <div className="rounded-xl bg-[#F8F9FA] p-3">
                  <p className="truncate text-sm font-semibold text-[#1A1A2E]">{displayName}</p>
                  <p className="truncate text-xs text-[#6C757D]">{displayEmail ?? "No email saved yet"}</p>
                </div>

                <button
                  type="button"
                  onClick={handleChangeIdentity}
                  className="min-h-10 w-full rounded-xl border border-[#E9ECEF] px-3 text-left text-sm font-semibold text-[#1A1A2E] transition hover:border-[#4D96FF] hover:text-[#4D96FF]"
                >
                  Change name
                </button>

                {!displayEmail ? (
                  <button
                    type="button"
                    onClick={handleChangeIdentity}
                    className="min-h-10 w-full rounded-xl border border-[#E9ECEF] px-3 text-left text-sm font-semibold text-[#1A1A2E] transition hover:border-[#4D96FF] hover:text-[#4D96FF]"
                  >
                    Add email to save your identity
                  </button>
                ) : null}

                {identity ? (
                  <button
                    type="button"
                    onClick={() => void clearIdentity()}
                    className="min-h-10 w-full rounded-xl bg-[#FF6B6B] px-3 text-left text-sm font-semibold text-white transition hover:brightness-95"
                  >
                    Sign out
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setIsMenuOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E9ECEF] text-[#1A1A2E] transition hover:bg-[#F8F9FA] md:hidden"
        >
          <span className="text-xl">☰</span>
        </button>
      </nav>

      <div className={`fixed inset-0 z-50 transition ${isMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close menu backdrop"
          onClick={() => setIsMenuOpen(false)}
          className={`absolute inset-0 bg-black/40 transition ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
        />

        <aside
          className={`absolute right-0 top-0 h-full w-80 max-w-[90vw] border-l border-[#E9ECEF] bg-white p-5 shadow-xl transition-transform duration-200 ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-between">
            <p className="text-lg font-bold text-[#1A1A2E]">Menu</p>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E9ECEF] text-[#1A1A2E]"
            >
              ✕
            </button>
          </div>

          <div className="mb-4 rounded-2xl bg-[#F8F9FA] p-3">
            <div className="flex items-center gap-2">
              <Avatar name={displayName} color={avatarColor} size="sm" />
              <div>
                <p className="text-sm font-semibold text-[#1A1A2E]">{displayName}</p>
                <p className="text-xs text-[#6C757D]">{displayEmail ?? "Guest"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {activeLinks.map((link) => {
              const isActive = currentPath.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive ? "bg-[#F8F9FA] text-[#1A1A2E]" : "text-[#6C757D] hover:bg-[#F8F9FA] hover:text-[#1A1A2E]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => void handleProtectedNavigation("/upload")}
              className="min-h-11 w-full rounded-full bg-[#4D96FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95"
            >
              Upload
            </button>

            <button
              type="button"
              onClick={() => void handleProtectedNavigation("/party/create")}
              className="min-h-11 w-full rounded-full border border-[#E9ECEF] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A2E] shadow-sm transition active:scale-95"
            >
              Create Party
            </button>

            <button
              type="button"
              onClick={handleChangeIdentity}
              className="min-h-11 w-full rounded-full border border-[#E9ECEF] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A2E] shadow-sm transition active:scale-95"
            >
              {displayEmail ? "Change name" : "Add email / change name"}
            </button>

            {identity ? (
              <button
                type="button"
                onClick={() => void clearIdentity()}
                className="min-h-11 w-full rounded-full bg-[#FF6B6B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </aside>
      </div>
    </header>
  );
}
