"use client";

import { usePathname } from "next/navigation";

import AdminGuard from "@/app/admin/_components/AdminGuard";
import AdminHeader from "@/app/admin/_components/AdminHeader";
import AdminSidebar from "@/app/admin/_components/AdminSidebar";

/** Provides admin route layout with responsive sidebar and auth guarding. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicAdminRoute = pathname === "/admin" || pathname === "/admin/login";

  if (isPublicAdminRoute) {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="min-h-full bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:py-6 md:flex-row">
          <AdminSidebar />
          <div className="min-w-0 flex-1 space-y-4">
            <AdminHeader />
            <main className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
