"use client";

import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Lets a signed-in user turn TOTP-based two-factor authentication on or off. */
export default function MfaSetup() {
  const { user, refreshUser } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/auth/mfa/setup");
      setQrCode(res.data.data.qrCodeDataUrl);
      setSecret(res.data.data.secret);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/mfa/verify", { token });
      setQrCode(null);
      setSecret(null);
      setToken("");
      setStatus("Two-factor authentication is now enabled.");
      await refreshUser();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function disable(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/mfa/disable", { token });
      setToken("");
      setStatus("Two-factor authentication has been turned off.");
      await refreshUser();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6 space-y-4">
      <div>
        <h2 className="font-serif text-lg font-semibold text-foreground">Two-factor authentication</h2>
        <p className="text-sm text-muted">
          Protect your account with a time-based one-time code from an authenticator app (Google Authenticator, Authy, etc.).
        </p>
      </div>

      {status ? <p className="text-sm font-semibold text-success">{status}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {qrCode ? (
        <form onSubmit={confirmEnable} className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="Scan this QR code with your authenticator app" className="h-40 w-40 rounded-lg bg-white p-2" />
          <p className="text-xs text-muted break-all">Manual entry key: {secret}</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter 6-digit code"
            className="w-full max-w-xs rounded-lg border border-hairline bg-surface-raised p-3 text-center text-lg tracking-widest text-foreground outline-none transition-colors duration-300 ease-out focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || token.length !== 6}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover disabled:opacity-50"
          >
            Confirm & enable
          </button>
        </form>
      ) : (
        <div>
          {/* We don't yet know isMfaEnabled from the /me payload by default; the setup
              button is safe to re-run and will simply overwrite an unused pending secret. */}
          <button
            type="button"
            onClick={() => void startSetup()}
            disabled={busy}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover disabled:opacity-50"
          >
            Set up two-factor authentication
          </button>

          <form onSubmit={disable} className="mt-4 flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Code to disable"
              className="w-40 rounded-lg border border-hairline bg-surface-raised p-2 text-sm text-foreground outline-none transition-colors duration-300 ease-out focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy || token.length !== 6}
              className="rounded-full border border-danger/50 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger transition-colors duration-300 ease-out hover:bg-danger/20 disabled:opacity-50"
            >
              Disable 2FA
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
