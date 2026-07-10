import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/app/lib/supabase";
import ArcCarousel from "@/components/ArcCarousel";
import LandingScrollHandler from "@/components/LandingScrollHandler";

export const metadata = {
  title: "Album — Your memories, beautifully shared",
  description: "Album is a photo sharing platform for creating albums, hosting photo parties with QR codes, and sharing memories.",
};

const PLACEHOLDER_PHOTOS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=300',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300',
  'https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=300',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300',
];

/** Redirects root route traffic to albums. */
export default async function Home() {
  const user = await getSessionUser();
  if (user) {
    redirect("/album");
  }

  const { data: recentPhotos } = await supabase
    .from('photos')
    .select('url')
    .order('created_at', { ascending: false })
    .limit(20);

  let photoUrls = recentPhotos?.map(p => p.url) ?? [];
  if (photoUrls.length < 9) {
    photoUrls = [...photoUrls, ...PLACEHOLDER_PHOTOS].slice(0, Math.max(9, photoUrls.length + PLACEHOLDER_PHOTOS.length));
  }

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', backgroundColor: '#0A0A0A' }}>
      {/* Noise Texture */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.02,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      <ArcCarousel photos={photoUrls} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 65%, rgba(10,10,10,0.95) 30%, rgba(10,10,10,0.6) 60%, transparent 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Navbar overlay wrapper to avoid background styles from generic navbar if needed, but AppShell shows generic Navbar. We'll add our own absolute overlay here if AppShell's Navbar is standard. */}
      {/* Actually, AppShell renders Navbar automatically, which we noted earlier: we can just hide the global navbar on this page if possible or let it be. But we can build the requested layout over it for now and let it ride. */}

      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 2,
          pointerEvents: 'auto',
          width: '100%',
          padding: '0 24px',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
            lineHeight: 1.1,
          }}
        >
          Your memories,<br />beautifully shared
        </h1>

        <p
          style={{
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            color: 'rgba(255,255,255,0.55)',
            maxWidth: '380px',
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}
        >
          Create albums, host events, and share moments with the people who matter.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link
            href="/register"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '50px',
              fontSize: '15px',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
            }}
          >
            Get started
          </Link>

          <Link
            href="/login"
            style={{
              background: '#FFFFFF',
              border: 'none',
              color: '#0A0A0A',
              padding: '12px 28px',
              borderRadius: '50px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
            }}
          >
            Log in
          </Link>
        </div>
      </div>

      {/* Scroll CTA */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '12px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          animation: 'fadeIn 2s ease forwards 2s',
          opacity: 0, 
        }}
      >
        Scroll down
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            to { opacity: 1; }
          }
        `}} />
      </div>

      <LandingScrollHandler />
    </div>
  );
}
