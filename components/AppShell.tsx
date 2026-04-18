"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import IdentityGate from "@/components/IdentityGate";
import IdentityProvider from "@/components/IdentityProvider";
import Navbar from "@/components/Navbar";

/** Client app shell with global identity gating and crash fallback boundary. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <IdentityProvider>
      <ErrorBoundary>
        <div className="flex min-h-full flex-col">
          <Navbar />
          <IdentityGate>{children}</IdentityGate>
        </div>
      </ErrorBoundary>
    </IdentityProvider>
  );
}
