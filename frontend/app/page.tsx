import Link from "next/link";
import ArcCarousel from "@/components/ArcCarousel";
import LandingScrollHandler from "@/components/LandingScrollHandler";

export const metadata = {
  title: "Painting Marketplace — Buy and sell original art",
  description: "Discover original paintings from independent artists. Buy at a fixed price or bid in a live auction.",
};

const PLACEHOLDER_PHOTOS = [
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262',
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
  const photoUrls = PLACEHOLDER_PHOTOS;

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
          Original paintings,<br />bought and sold directly
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
          Browse fixed-price listings or bid in a live auction. Artists get paid directly through Stripe.
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
