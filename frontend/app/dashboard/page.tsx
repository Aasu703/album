'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { Artwork } from '@/app/lib/types';
import CreateListingModal from './_components/CreateListingModal';
import GalleryFeedCard from './_components/GalleryFeedCard';
import ArtistArtworkCard from './_components/ArtistArtworkCard';

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [feed, setFeed] = useState<Artwork[]>([]);
  const [myArtworks, setMyArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await api.get('/artworks', { params: { limit: 6 } });
      setFeed(res.data.data.items);
    } catch {
      setFeed([]);
    }
  }, []);

  const fetchMyPaintings = useCallback(async (painterId: string) => {
    try {
      const res = await api.get('/artworks', { params: { painterId } });
      setMyArtworks(res.data.data.items);
    } catch {
      setMyArtworks([]);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    const tasks: Promise<void>[] = [fetchFeed()];
    if (user.role === 'VERIFIED_ARTIST') {
      tasks.push(fetchMyPaintings(user.id));
    }
    void Promise.all(tasks).finally(() => setLoading(false));
  }, [authLoading, user, router, fetchFeed, fetchMyPaintings]);

  async function handleApplySeller() {
    setApplying(true);
    setApplyError(null);
    try {
      await api.post('/users/apply-seller');
      await refreshUser();
    } catch (err) {
      setApplyError(extractErrorMessage(err));
    } finally {
      setApplying(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        Loading your dashboard...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
          <div>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-2 text-muted">
              Welcome back, {user.firstName}{' '}
              <span className="text-accent">({user.role.replace('_', ' ')})</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="rounded-full border border-hairline bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
            >
              Edit profile
            </Link>
            {user.role === 'VERIFIED_ARTIST' && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background shadow-lg transition-all duration-300 ease-out hover:bg-accent-hover active:scale-95"
              >
                + Post painting
              </button>
            )}
          </div>
        </header>

        {/* Role-specific callouts */}
        {user.role === 'USER' && (
          <section className="space-y-3 rounded-2xl border border-hairline bg-surface p-6">
            <h2 className="font-serif text-lg font-semibold text-foreground">Become a painter</h2>
            <p className="text-sm text-muted">
              Apply to become a verified artist so you can post your own paintings to the gallery.
            </p>

            {user.sellerStatus === 'none' && (
              <div className="space-y-2">
                {applyError ? <p className="text-sm text-danger">{applyError}</p> : null}
                <button
                  onClick={() => void handleApplySeller()}
                  disabled={applying}
                  className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background shadow-lg transition-all duration-300 ease-out hover:bg-accent-hover active:scale-95 disabled:opacity-50"
                >
                  {applying ? 'Submitting...' : 'Apply to become a painter'}
                </button>
              </div>
            )}

            {user.sellerStatus === 'pending' && (
              <span className="inline-block rounded-lg bg-warning/15 px-4 py-2 text-sm font-medium text-warning">
                Your painter application is pending review.
              </span>
            )}

            {user.sellerStatus === 'rejected' && (
              <span className="inline-block rounded-lg bg-danger/15 px-4 py-2 text-sm font-medium text-danger">
                Your painter application was rejected.
              </span>
            )}
          </section>
        )}

        {user.role === 'ADMIN' && (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-6">
            <div>
              <h2 className="font-serif text-lg font-semibold text-foreground">Admin console</h2>
              <p className="mt-1 text-sm text-muted">
                Review painter applications, manage users, and see gallery stats.
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background shadow-lg transition-colors duration-300 ease-out hover:bg-accent-hover"
            >
              Open admin console
            </Link>
          </section>
        )}

        {/* Artist's own paintings */}
        {user.role === 'VERIFIED_ARTIST' && (
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-semibold text-foreground">Your paintings</h2>
            {myArtworks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-hairline bg-surface/40 py-12 text-center text-muted">
                You haven&apos;t posted any paintings yet.
              </p>
            ) : (
              <div className="flex w-full max-w-2xl flex-col gap-6">
                {myArtworks.map((art) => (
                  <ArtistArtworkCard key={art.id} artwork={art} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Interactive gallery feed — for every role */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-foreground">Latest from the gallery</h2>
            <Link
              href="/paintings"
              className="text-sm font-semibold text-muted transition-colors duration-300 ease-out hover:text-accent"
            >
              Browse all →
            </Link>
          </div>

          {feed.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-hairline bg-surface/40 py-12 text-center text-muted">
              No paintings in the gallery yet.
            </p>
          ) : (
            <div className="flex w-full max-w-2xl flex-col gap-6">
              {feed.map((art) => (
                <GalleryFeedCard key={art.id} artwork={art} />
              ))}
            </div>
          )}
        </section>
      </div>

      <CreateListingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          void fetchFeed();
          if (user.role === 'VERIFIED_ARTIST') void fetchMyPaintings(user.id);
        }}
      />
    </div>
  );
}
