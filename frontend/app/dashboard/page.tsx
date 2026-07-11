'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import type { Artwork } from '@/app/lib/types';
import CreateListingModal from './_components/CreateListingModal';

export default function SocialFeed() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/artworks');
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

    void fetchFeed();
  }, [authLoading, user, router, fetchFeed]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading Secure Feed...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        <header className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-indigo-500">
              Painter's Hub
            </h1>
            <p className="text-gray-400 mt-2">Welcome back, {user?.firstName} ({user?.role})</p>
          </div>

          {/* Conditional RBAC UI: Only VERIFIED_ARTIST can create listings */}
          {user?.role === 'VERIFIED_ARTIST' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-lg transition-transform active:scale-95"
            >
              + Create Listing / Auction
            </button>
          )}

          {user?.role === 'USER' && user.sellerStatus === 'none' && (
            <button
              onClick={async () => {
                await api.post('/users/apply-seller');
                router.refresh();
              }}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg shadow-lg transition-transform active:scale-95"
            >
              Apply to sell
            </button>
          )}

          {user?.role === 'USER' && user.sellerStatus === 'pending' && (
            <span className="px-4 py-2 rounded-lg bg-yellow-900/40 text-yellow-300 text-sm font-medium">
              Seller application pending
            </span>
          )}
        </header>

        {artworks.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No listings yet.</p>
        ) : (
          <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {artworks.map((art) => (
              <Link
                key={art.id}
                href={`/paintings/${art.id}`}
                className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-indigo-500/50 transition-colors group block"
              >
                <div className="aspect-square bg-gray-800 overflow-hidden relative">
                  <img src={art.imageUrl} alt={art.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-semibold border border-white/10">
                    {art.listingType.replace('_', ' ')}
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <h2 className="text-xl font-bold">{art.title}</h2>
                  <p className="text-gray-400 text-sm line-clamp-2">{art.description}</p>

                  {art.listingType === 'AUCTION' && (
                    <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                      <div>
                        <p className="text-xs text-gray-500">Highest Bid</p>
                        <p className="text-lg font-bold text-green-400">${art.currentHighestBid ?? art.price}</p>
                      </div>
                      <span className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded shadow">
                        Place Bid →
                      </span>
                    </div>
                  )}

                  {art.listingType === 'FOR_SALE' && (
                    <p className="text-lg font-bold text-green-400 pt-4 border-t border-gray-800">${art.price}</p>
                  )}
                </div>
              </Link>
            ))}
          </main>
        )}
      </div>

      <CreateListingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => void fetchFeed()}
      />
    </div>
  );
}
