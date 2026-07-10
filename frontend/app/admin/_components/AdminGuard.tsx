"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AdminGuardProps {
  children: React.ReactNode;
}

/** Guards admin routes using localStorage-based admin session state. */
export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<"checking" | "authed" | "unauth">("checking");

  useEffect(() => {
    const authFlag = window.localStorage.getItem("adminAuth");
    const password = window.localStorage.getItem("adminPassword");
    const authed = authFlag === "true" && Boolean(password);

    if (!authed) {
      router.push("/admin/login");
    }

    const frame = window.requestAnimationFrame(() => {
      setAuthState(authed ? "authed" : "unauth");
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [router]);

  if (authState !== "authed") {
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
