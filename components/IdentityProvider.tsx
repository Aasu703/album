"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import type { UserIdentity } from "@/app/lib/types";
import IdentitySheet from "@/components/IdentitySheet";

const IDENTITY_STORAGE_KEY = "album-user-identity";
const GUEST_ID_STORAGE_KEY = "album-guest-id";

interface IdentityPromptOptions {
  force?: boolean;
}

interface IdentityContextValue {
  identity: UserIdentity | null;
  isLoading: boolean;
  setIdentity: (value: UserIdentity) => void;
  clearIdentity: () => Promise<void>;
  requestIdentity: (options?: IdentityPromptOptions) => Promise<UserIdentity | null>;
  openIdentityEditor: () => void;
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
    (candidate.email === null || typeof candidate.email === "string") &&
    typeof candidate.avatarColor === "string" &&
    candidate.avatarColor.length > 0 &&
    (typeof candidate.isGuest === "boolean" || typeof candidate.isGuest === "undefined") &&
    (candidate.guestId === null || typeof candidate.guestId === "string" || typeof candidate.guestId === "undefined")
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

/** Reads persisted guest identifier from localStorage. */
function readStoredGuestId() {
  const value = window.localStorage.getItem(GUEST_ID_STORAGE_KEY)?.trim() ?? "";
  return value.length > 0 ? value : null;
}

/** Persists or clears guest identifier based on identity mode. */
function persistGuestId(value: string | null | undefined) {
  if (!value) {
    window.localStorage.removeItem(GUEST_ID_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, value);
}

/** Provides cookie-backed identity with localStorage as a fast client-side cache. */
export default function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentityState] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isIdentitySheetOpen, setIsIdentitySheetOpen] = useState(false);
  const pendingResolverRef = useRef<((value: UserIdentity | null) => void) | null>(null);
  const pendingPromiseRef = useRef<Promise<UserIdentity | null> | null>(null);

  useEffect(() => {
    const storedIdentity = readStoredIdentity();
    const storedGuestId = readStoredGuestId();

    if (storedIdentity) {
      setIdentityState(storedIdentity);
    }

    setGuestId(storedGuestId);

    setIsLoading(false);

    const controller = new AbortController();
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Session check failed (${response.status}).`);
        }

        const payload = (await response.json()) as { user: UserIdentity | null };
        if (!active) {
          return;
        }

        if (payload.user && isUserIdentity(payload.user)) {
          setIdentityState(payload.user);
          window.localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(payload.user));
          persistGuestId(payload.user.guestId ?? null);
          setGuestId(payload.user.guestId ?? null);
          return;
        }

        if (!storedIdentity) {
          setIdentityState(null);
        }
      } catch {
        // Preserve cached identity when session check fails due to network/transient issues.
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  function setIdentity(value: UserIdentity) {
    setIdentityState(value);
    window.localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(value));
    persistGuestId(value.guestId ?? null);
    setGuestId(value.guestId ?? null);
  }

  async function clearIdentity() {
    setIdentityState(null);
    window.localStorage.removeItem(IDENTITY_STORAGE_KEY);
    persistGuestId(null);
    setGuestId(null);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // Clearing local identity is still best-effort even if logout request fails.
    }
  }

  function resolvePendingIdentity(value: UserIdentity | null) {
    pendingResolverRef.current?.(value);
    pendingResolverRef.current = null;
    pendingPromiseRef.current = null;
  }

  function requestIdentity(options: IdentityPromptOptions = {}) {
    if (identity && !options.force) {
      return Promise.resolve(identity);
    }

    setIsIdentitySheetOpen(true);

    if (pendingPromiseRef.current) {
      return pendingPromiseRef.current;
    }

    const promise = new Promise<UserIdentity | null>((resolve) => {
      pendingResolverRef.current = resolve;
    });

    pendingPromiseRef.current = promise;
    return promise;
  }

  function openIdentityEditor() {
    void requestIdentity({ force: true });
  }

  function handleSheetResolved(nextIdentity: UserIdentity) {
    setIdentity(nextIdentity);
    setIsIdentitySheetOpen(false);
    resolvePendingIdentity(nextIdentity);
  }

  function handleSheetClosed() {
    setIsIdentitySheetOpen(false);
    resolvePendingIdentity(null);
  }

  const contextValue: IdentityContextValue = {
    identity,
    isLoading,
    setIdentity,
    clearIdentity,
    requestIdentity,
    openIdentityEditor,
  };

  return (
    <IdentityContext.Provider value={contextValue}>
      {children}
      <IdentitySheet
        isOpen={isIdentitySheetOpen}
        defaultName={identity?.name ?? ""}
        defaultEmail={identity?.email ?? ""}
        guestId={guestId}
        onClose={handleSheetClosed}
        onResolved={handleSheetResolved}
      />
    </IdentityContext.Provider>
  );
}

/** Hook for reading and mutating persistent local user identity. */
export function useIdentity() {
  const context = useContext(IdentityContext);

  if (!context) {
    throw new Error("useIdentity must be used within IdentityProvider.");
  }

  return context;
}
