'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingScrollHandler() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isExiting) return;

    const handleScrollEvent = (delta: number) => {
      if (delta > 30) {
        setIsExiting(true);
        setTimeout(() => {
          router.push('/album');
        }, 500); // 500ms fade transition
      } else if (delta < -30) {
        setIsExiting(true);
        setTimeout(() => {
          router.back();
        }, 500); // 500ms fade transition
      }
    };

    const onWheel = (e: WheelEvent) => handleScrollEvent(e.deltaY);
    
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      const deltaY = startY - e.touches[0].clientY;
      handleScrollEvent(deltaY);
    };

    // Keyboard support (down/up arrow, space, page down/up)
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowDown', 'Space', 'PageDown'].includes(e.code)) {
        handleScrollEvent(40);
      } else if (['ArrowUp', 'PageUp'].includes(e.code)) {
        handleScrollEvent(-40);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isExiting, router]);

  if (!isExiting) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0A0A0A',
        zIndex: 9999,
        animation: 'landingFadeOut 0.5s ease-in-out forwards',
        pointerEvents: 'none',
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes landingFadeOut {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}
