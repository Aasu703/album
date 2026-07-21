"use client";

import { usePathname } from "next/navigation";

import AuthProvider from "@/components/AuthProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";
import AdminNav from "@/components/AdminNav";

// Auth screens are self-contained and intentionally chrome-free, so the app nav is
// suppressed on them. The landing page ("/") is handled inside Navbar, which renders a
// transparent overlay variant that belongs to the hero rather than the app shell.
const NAV_FREE_ROUTES = ["/login", "/register", "/forgot-password"];

/** Client app shell with global auth context and crash fallback boundary. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const isNavFree = NAV_FREE_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );

  function renderNav() {
    if (isNavFree) return null;
    return isAdminRoute ? <AdminNav /> : <Navbar />;
  }

  return (
    <AuthProvider>
      <ErrorBoundary>
        <div className="flex min-h-full flex-col">
          {renderNav()}
          {children}
        </div>
      </ErrorBoundary>
    </AuthProvider>
  );
}
