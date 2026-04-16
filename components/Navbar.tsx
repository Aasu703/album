"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/album", label: "Albums" },
  { href: "/upload", label: "Upload" },
];

/** Renders the top navigation for album and upload pages. */
export default function Navbar() {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/album"
          className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100"
        >
          Personal Album
        </Link>
        <div className="flex items-center gap-2">
          {links.map((link) => {
            const isActive = currentPath.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
