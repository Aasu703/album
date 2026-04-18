"use client";

import { usePathname, useRouter } from "next/navigation";

import { clearAdminSession } from "@/app/lib/admin-client";

const titleMap: Record<string, string> = {
  "/admin/dashboard": "Admin Dashboard",
  "/admin/albums": "Albums Management",
  "/admin/photos": "Photos Management",
  "/admin/users": "Users Management",
  "/admin/parties": "Parties Management",
};

/** Top bar for admin pages with section title and logout action. */
export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const title = titleMap[pathname] ?? "Admin";

  function handleLogout() {
    clearAdminSession();
    router.replace("/admin/login");
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Manage albums, photos, users, and parties.</p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="min-h-11 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        Logout
      </button>
    </header>
  );
}
