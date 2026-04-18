"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useIdentity } from "@/components/IdentityProvider";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/album", label: "Albums" },
  { href: "/upload", label: "Upload" },
  { href: "/party/create", label: "Create Party" },
];

/** Renders the top navigation for album and upload pages. */
export default function Navbar() {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const { identity, clearIdentity } = useIdentity();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link
          href="/album"
          className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100"
        >
          Personal Album
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {links.map((link) => {
            const isActive = currentPath.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {identity ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <span className="max-w-36 truncate" title={identity.name}>
                {identity.name}
              </span>
              <button
                type="button"
                onClick={clearIdentity}
                className="rounded-full bg-gray-200 px-2 py-1 text-gray-900 transition hover:bg-gray-300"
              >
                Not you?
              </button>
            </div>
          ) : null}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
