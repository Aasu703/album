"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isAdminSessionActive } from "@/app/lib/admin-client";

interface AdminGuardProps {
  children: React.ReactNode;
}

/** Guards admin routes using localStorage-based admin session state. */
export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const isAuthed = isAdminSessionActive();

  useEffect(() => {
    if (!isAuthed) {
      router.replace("/admin/login");
    }
  }, [isAuthed, router]);

  if (!isAuthed) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-8">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-700 dark:border-t-gray-200" />
          Checking admin session...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
