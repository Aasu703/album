"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/albums", label: "Albums" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/parties", label: "Parties" },
];

/** Responsive admin sidebar with mobile hamburger navigation. */
export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-full bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-300 md:hidden"
      >
        Menu
      </button>

      {open ? (
        <button
          type="button"
          aria-label="Close menu backdrop"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-gray-900 p-4 text-white transition duration-200 md:static md:z-auto md:translate-x-0 md:rounded-2xl md:shadow-sm ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between md:justify-start">
          <p className="text-lg font-semibold tracking-tight">Admin Panel</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-white/30 px-3 py-1 text-xs md:hidden"
          >
            Close
          </button>
        </div>

        <nav className="space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block rounded-xl border-l-4 px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-[#4D96FF] bg-gray-800 text-white"
                    : "border-transparent text-gray-100 hover:bg-gray-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
