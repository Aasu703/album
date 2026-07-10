"use client";

import { usePathname } from "next/navigation";

import ErrorBoundary from "@/components/ErrorBoundary";
import IdentityProvider from "@/components/IdentityProvider";
import Navbar from "@/components/Navbar";

/** Client app shell with global identity gating and crash fallback boundary. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <ErrorBoundary>
        <div className="flex min-h-full flex-col">{children}</div>
      </ErrorBoundary>
    );
  }

  return (
    <IdentityProvider>
      <ErrorBoundary>
        <div className="flex min-h-full flex-col">
          <Navbar />
          {children}
        </div>
      </ErrorBoundary>
    </IdentityProvider>
  );
}
