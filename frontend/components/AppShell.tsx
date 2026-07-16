"use client";

import { usePathname } from "next/navigation";

import AuthProvider from "@/components/AuthProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";
import AdminNav from "@/components/AdminNav";

/** Client app shell with global auth context and crash fallback boundary. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <AuthProvider>
      <ErrorBoundary>
        <div className="flex min-h-full flex-col">
          {isAdminRoute ? <AdminNav /> : <Navbar />}
          {children}
        </div>
      </ErrorBoundary>
    </AuthProvider>
  );
}
