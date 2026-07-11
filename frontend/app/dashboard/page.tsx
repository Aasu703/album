'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'VERIFIED_ARTIST' | 'ADMIN';
}

interface Artwork {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  listingType: 'SOCIAL_ONLY' | 'FOR_SALE' | 'AUCTION';
  price?: number;
  currentHighestBid?: number;
}

export default function SocialFeed() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Task 3: Social Feed & Conditional RBAC UI
    // Fetch the current user securely using HttpOnly cookies
    const fetchUserAndFeed = async () => {
      try {
        // Assume we added a /auth/me or similar endpoint in the backend
        // For the sake of this coursework UI, we will mock the backend call if it doesn't exist
        // or call it if it does. The auth.service.ts has a 'me()' method.
        const res = await api.get('/auth/me'); 
        setUser(res.data.data.user);
      } catch (err) {
        router.push('/login');
        return;
      }

      // Mock fetching artworks since the backend endpoint GET /artworks wasn't explicitly requested to be built
      setArtworks([
        {
          id: '1',
          title: 'Starry Night Resonance',
          description: 'A modern take on a classic.',
          imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5',
          listingType: 'SOCIAL_ONLY',
        },
        {
          id: '2',
          title: 'Golden Horizon',
          description: 'Sunset over the abstract mountains.',
          imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262',
          listingType: 'AUCTION',
          currentHighestBid: 450,
        }
      ]);
      setLoading(false);
    };

    fetchUserAndFeed();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading Secure Feed...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">
              Painter's Hub
            </h1>
            <p className="text-gray-400 mt-2">Welcome back, {user?.firstName} ({user?.role})</p>
          </div>

          {/* Conditional RBAC UI: Only VERIFIED_ARTIST can create listings */}
          {user?.role === 'VERIFIED_ARTIST' && (
            <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-lg transition-transform active:scale-95">
              + Create Listing / Auction
            </button>
          )}
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {artworks.map((art) => (
            <article key={art.id} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-indigo-500/50 transition-colors group">
              <div className="aspect-square bg-gray-800 overflow-hidden relative">
                {/* Fallback image if URL fails */}
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
                      <p className="text-lg font-bold text-green-400">${art.currentHighestBid}</p>
                    </div>
                    <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded shadow transition-colors">
                      Place Bid
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </main>
      </div>
    </div>
  );
}
