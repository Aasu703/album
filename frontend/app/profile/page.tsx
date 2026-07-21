'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import Avatar from '@/components/Avatar';
import { generateAvatarColor } from '@/lib/avatar';
import ProfileUploads from '@/components/ProfileUploads';
import ProfileComments from '@/components/ProfileComments';

type Tab = 'posts' | 'activity';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>('posts');
  const [postCount, setPostCount] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        Loading your profile...
      </div>
    );
  }

  const displayName = `${user.firstName} ${user.lastName}`.trim();
  const username = user.email.split('@')[0];
  const roleLabel = user.role.replace('_', ' ').toLowerCase();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6">
      {/* Instagram-style header */}
      <header className="flex flex-col items-center gap-6 border-b border-hairline pb-8 sm:flex-row sm:items-start sm:gap-12 sm:pl-6">
        <Avatar
          name={displayName}
          color={generateAvatarColor(user.email)}
          size="xl"
          src={user.avatarUrl}
        />

        <div className="flex flex-1 flex-col items-center gap-4 sm:items-start">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <h1 className="text-xl font-semibold text-foreground">{username}</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/profile/settings"
                className="rounded-lg bg-surface-raised px-4 py-1.5 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:bg-surface"
              >
                Edit profile
              </Link>
              {user.role !== 'ADMIN' ? (
                <Link
                  href="/upload"
                  className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
                >
                  + New
                </Link>
              ) : null}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8">
            <span className="text-sm text-foreground">
              <strong className="font-semibold">{postCount ?? '—'}</strong>{' '}
              <span className="text-muted">{postCount === 1 ? 'post' : 'posts'}</span>
            </span>
          </div>

          {/* Name + role "bio" line */}
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-sm capitalize text-muted">{roleLabel}</p>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex items-center justify-center gap-12" aria-label="Profile sections">
        <button
          type="button"
          onClick={() => setTab('posts')}
          className={`-mt-px flex items-center gap-2 border-t-2 px-2 py-3 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ${
            tab === 'posts'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <span aria-hidden="true">▦</span> Posts
        </button>
        <button
          type="button"
          onClick={() => setTab('activity')}
          className={`-mt-px flex items-center gap-2 border-t-2 px-2 py-3 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ${
            tab === 'activity'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <span aria-hidden="true">💬</span> Activity
        </button>
      </nav>

      {/* Tab content */}
      <section className="pt-6">
        {tab === 'posts' ? (
          <ProfileUploads onCountChange={setPostCount} />
        ) : (
          <ProfileComments />
        )}
      </section>
    </main>
  );
}
