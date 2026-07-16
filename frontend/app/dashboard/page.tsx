'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { Artwork } from '@/app/lib/types';
import CreateListingModal from './_components/CreateListingModal';
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const fetchMyPaintings = useCallback(async (painterId: string) => {
    setLoading(true);
    try {
      const res = await api.get('/artworks', { params: { painterId } });
      setArtworks(res.data.data.items);
    } catch {
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role === 'VERIFIED_ARTIST') {
      void fetchMyPaintings(user.id);
    } else {
      setLoading(false);
    }
  }, [authLoading, user, router, fetchMyPaintings]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        Loading your dashboard...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-indigo-500">
              Dashboard
            </h1>
            <p className="text-gray-400 mt-2">
              Welcome back, {user.firstName} ({user.role.replace('_', ' ')})
            </p>
          </div>

          {user.role === 'VERIFIED_ARTIST' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-lg transition-transform active:scale-95"
            >
              + Post painting
            </button>
          )}
        </header>

        {user.role === 'USER' && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-3">
            <h2 className="text-lg font-bold text-white">Become a painter</h2>
            <p className="text-sm text-gray-400">
              Apply to become a verified artist so you can post your own paintings to the gallery.
            </p>

            {user.sellerStatus === 'none' && (
              <div className="space-y-2">
                {applyError ? <p className="text-sm text-red-400">{applyError}</p> : null}
                <button
                  onClick={() => void handleApplySeller()}
                  disabled={applying}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                >
                  {applying ? 'Submitting...' : 'Apply to become a painter'}
                </button>
              </div>
            )}

            {user.sellerStatus === 'pending' && (
              <span className="inline-block px-4 py-2 rounded-lg bg-yellow-900/40 text-yellow-300 text-sm font-medium">
                Your painter application is pending review.
              </span>
            )}

            {user.sellerStatus === 'rejected' && (
              <span className="inline-block px-4 py-2 rounded-lg bg-red-900/40 text-red-300 text-sm font-medium">
                Your painter application was rejected.
              </span>
            )}
          </section>
        )}

        {user.role === 'VERIFIED_ARTIST' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white">Your paintings</h2>
            {artworks.length === 0 ? (
              <p className="text-center text-gray-500 py-12">
                You haven&apos;t posted any paintings yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {artworks.map((art) => (
                  <Link
                    key={art.id}
                    href={`/paintings/${art.id}`}
                    className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-indigo-500/50 transition-colors group block"
                  >
                    <div className="relative aspect-square bg-gray-800 overflow-hidden">
                      <Image
                        src={art.imageUrl}
                        alt={art.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6 space-y-2">
                      <h3 className="text-xl font-bold">{art.title}</h3>
                      <p className="text-gray-400 text-sm line-clamp-2">{art.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <MfaSetup />
        </section>
      </div>

      <CreateListingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => user.role === 'VERIFIED_ARTIST' && void fetchMyPaintings(user.id)}
      />
    </div>
  );
}
