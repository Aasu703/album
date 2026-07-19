'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import MfaSetup from '@/components/MfaSetup';

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone ?? '');
  }, [authLoading, user, router]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await api.patch('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      await refreshUser();
      setStatus('Profile updated.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        Loading your settings...
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-hairline bg-surface-raised p-3 text-sm text-foreground outline-none transition-colors duration-300 ease-out focus:border-accent focus:ring-2 focus:ring-accent';
  const readonlyClass =
    'w-full rounded-lg border border-hairline bg-background/60 p-3 text-sm text-muted';

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Edit profile</h1>
          <p className="mt-1 text-sm text-muted">Update your personal details and account security.</p>
        </div>
        <Link
          href="/profile"
          className="text-sm font-semibold text-muted transition-colors duration-300 ease-out hover:text-accent"
        >
          ← Back to profile
        </Link>
      </header>

      <section className="rounded-2xl border border-hairline bg-surface p-6">
        <h2 className="font-serif text-lg font-semibold text-foreground">Personal details</h2>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={60}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={60}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Phone number <span className="text-muted/70 text-xs">(Optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Email</label>
              <input type="email" value={user.email} readOnly disabled className={readonlyClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Account role</label>
              <input type="text" value={user.role.replace('_', ' ')} readOnly disabled className={readonlyClass} />
            </div>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {status ? <p className="text-sm font-semibold text-success">{status}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background shadow-md transition-colors duration-300 ease-out hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-hairline bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-foreground">Password</h2>
            <p className="mt-1 text-sm text-muted">Change the password you use to sign in.</p>
          </div>
          <Link
            href="/profile/change-password"
            className="rounded-full border border-hairline bg-surface-raised px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
          >
            Change password
          </Link>
        </div>
      </section>

      <section>
        <MfaSetup />
      </section>
    </main>
  );
}
