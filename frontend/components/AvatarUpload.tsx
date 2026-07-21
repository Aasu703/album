'use client';

import { useRef, useState } from 'react';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { generateAvatarColor } from '@/lib/avatar';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/** Lets the signed-in user upload, replace, or clear their profile picture. */
export default function AvatarUpload() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!user) return null;

  const displayName = `${user.firstName} ${user.lastName}`.trim();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset immediately so re-picking the same file still fires a change event.
    event.target.value = '';
    if (!file) return;

    setError(null);
    setStatus(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Profile picture must be a JPEG, PNG, or WEBP image.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Profile picture must be 5MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setBusy(true);
    try {
      await api.post('/users/me/avatar', formData);
      await refreshUser();
      setStatus('Profile picture updated.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      await api.delete('/users/me/avatar');
      await refreshUser();
      setStatus('Profile picture removed.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="font-serif text-lg font-semibold text-foreground">Profile picture</h2>
      <p className="mt-1 text-sm text-muted">
        JPEG, PNG, or WEBP — up to 5MB. Without one we show your initials.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <Avatar
          name={displayName}
          color={generateAvatarColor(user.email)}
          size="xl"
          src={user.avatarUrl}
        />

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-background shadow-md transition-colors duration-300 ease-out hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? 'Working...' : user.avatarUrl ? 'Change picture' : 'Upload picture'}
            </button>

            {user.avatarUrl ? (
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={busy}
                className="rounded-full border border-hairline bg-surface-raised px-5 py-2.5 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:border-danger hover:text-danger disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {status ? <p className="text-sm font-semibold text-success">{status}</p> : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => void handleFileChange(e)}
        className="hidden"
      />
    </section>
  );
}
