"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { UserIdentity } from "@/app/lib/types";

const IDENTITY_STORAGE_KEY = "album-user-identity";

interface IdentityContextValue {
  identity: UserIdentity | null;
  isLoading: boolean;
  setIdentity: (value: UserIdentity) => void;
  clearIdentity: () => void;
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

/** Validates persisted identity structure before using it in the app. */
function isUserIdentity(value: unknown): value is UserIdentity {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<UserIdentity>;

  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.name === "string" &&
    candidate.name.length > 0 &&
    typeof candidate.email === "string" &&
    candidate.email.length > 0
  );
}

/** Reads identity from localStorage with JSON parsing safety. */
function readStoredIdentity() {
  try {
    const raw = window.localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isUserIdentity(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Provides persistent local user identity for unauthenticated guest flows. */
export default function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentityState] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readStoredIdentity();
      setIdentityState(stored);
      setIsLoading(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function setIdentity(value: UserIdentity) {
    setIdentityState(value);
    window.localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(value));
  }

  function clearIdentity() {
    setIdentityState(null);
    window.localStorage.removeItem(IDENTITY_STORAGE_KEY);
  }

  const contextValue = useMemo<IdentityContextValue>(
    () => ({
      identity,
      isLoading,
      setIdentity,
      clearIdentity,
    }),
    [identity, isLoading],
  );

  return <IdentityContext.Provider value={contextValue}>{children}</IdentityContext.Provider>;
}

/** Hook for reading and mutating persistent local user identity. */
export function useIdentity() {
  const context = useContext(IdentityContext);

  if (!context) {
    throw new Error("useIdentity must be used within IdentityProvider.");
  }

  return context;
}
