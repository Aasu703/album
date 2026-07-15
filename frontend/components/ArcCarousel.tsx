'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface ArcCarouselProps {
  photos: string[];
}

export default function ArcCarousel({ photos }: ArcCarouselProps) {
  const [offset, setOffset] = useState(0);
  const animRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({
    radius: 560,
    photoCount: 11,
    photoSize: 130,
    arcStart: 195,
    arcEnd: 345,
  });

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      if (width > 1200) {
        setDimensions({ radius: 560, photoCount: 11, photoSize: 130, arcStart: 195, arcEnd: 345 });
      } else if (width > 768) {
        setDimensions({ radius: 440, photoCount: 9, photoSize: 110, arcStart: 195, arcEnd: 345 });
      } else {
        setDimensions({ radius: 300, photoCount: 7, photoSize: 80, arcStart: 200, arcEnd: 340 });
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current) {
        const delta = timestamp - lastTimeRef.current;
        setOffset((prev) => (prev + 0.012 * delta * 0.05) % 360);
      }
      lastTimeRef.current = timestamp;
      animRef.current = requestAnimationFrame(animate);
    };

    const handleVisibility = () => {
      if (document.hidden && animRef.current) {
        cancelAnimationFrame(animRef.current);
        lastTimeRef.current = 0;
      } else {
        lastTimeRef.current = performance.now();
        animRef.current = requestAnimationFrame(animate);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const centerX = 0;
  const centerY = 280;

  const photoPositions = Array.from({ length: dimensions.photoCount }, (_, i) => {
    const spread = dimensions.arcEnd - dimensions.arcStart;
    const baseAngle = dimensions.arcStart + (i / (dimensions.photoCount - 1)) * spread;
    const angle = ((baseAngle + offset) % 360) * (Math.PI / 180);

    const x = centerX + dimensions.radius * Math.cos(angle);
    const y = centerY + dimensions.radius * Math.sin(angle);

    const baseTangent = (angle * 180) / Math.PI + 90;
    const extraTilt = ((i * 137.5) % 17) - 8;
    const tangentAngle = baseTangent + extraTilt;

    const normalizedPos = i / (dimensions.photoCount - 1);
    const isEdge = i === 0 || i === dimensions.photoCount - 1;
    
    // Scale and opacity adjustments
    let sizeScale = 0.75 + 0.35 * Math.sin(normalizedPos * Math.PI);
    let opacity = 0.3 + 0.7 * Math.sin(normalizedPos * Math.PI);
    
    if (isEdge) {
      sizeScale *= 0.8;
      opacity *= 0.5;
    }

    const zIndex = Math.round(10 * Math.sin(normalizedPos * Math.PI));
    const isCenter = Math.abs(normalizedPos - 0.5) < 0.2;

    return {
      x,
      y,
      rotation: tangentAngle,
      scale: sizeScale,
      opacity,
      zIndex,
      isCenter,
      photoIndex: i % Math.max(1, photos.length),
    };
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 0,
          height: 0,
        }}
      >
        {photoPositions.map((pos, i) => {
          const photoUrl = photos[pos.photoIndex] || '/placeholder.jpg';
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: dimensions.photoSize * pos.scale,
                height: dimensions.photoSize * pos.scale,
                transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
                opacity: pos.opacity,
                zIndex: pos.zIndex,
                transition: 'none',
                borderRadius: '20px',
                overflow: 'hidden',
                willChange: 'transform, opacity',
                boxShadow: pos.isCenter
                  ? '0 8px 40px rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5)'
                  : '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <Image
                src={photoUrl}
                alt=""
                fill
                priority={i < 3}
                style={{ objectFit: 'cover' }}
                sizes={`${Math.ceil(dimensions.photoSize)}px`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
