"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/album", label: "Albums" },
  { href: "/upload", label: "Upload" },
];

/** Renders the top navigation for album and upload pages. */
export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/album" className="text-lg font-semibold tracking-tight text-slate-900">
          Personal Album
        </Link>
        <div className="flex items-center gap-2">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
