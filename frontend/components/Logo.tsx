import Image from "next/image";

import iconDark from "@/app/assets/album-icon-dark.png";
import iconLight from "@/app/assets/album-icon-light.png";
import wordmarkDark from "@/app/assets/album-wordmark-dark.png";
import wordmarkLight from "@/app/assets/album-wordmark-light.png";

type LogoVariant = "lockup" | "icon" | "wordmark";
type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  /** `lockup` pairs the icon with the wordmark; the others render one mark alone. */
  variant?: LogoVariant;
  size?: LogoSize;
  /** Set on above-the-fold marks (nav, auth screens) so they aren't lazy-loaded. */
  priority?: boolean;
  className?: string;
}

const iconSizeMap: Record<LogoSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-14 w-14",
};

const wordmarkSizeMap: Record<LogoSize, string> = {
  sm: "h-3.5",
  md: "h-4",
  lg: "h-6",
};

// Both theme variants are always rendered and swapped with CSS rather than by reading the
// theme in JS. The theme class is applied pre-hydration (see THEME_INIT_SCRIPT in layout),
// so a CSS swap shows the correct mark on first paint with no flash and no hydration risk.
const LIGHT_ONLY = "block dark:hidden";
const DARK_ONLY = "hidden dark:block";

/** Theme-aware Album brand mark. */
export default function Logo({
  variant = "lockup",
  size = "md",
  priority = false,
  className = "",
}: LogoProps) {
  const showIcon = variant === "lockup" || variant === "icon";
  const showWordmark = variant === "lockup" || variant === "wordmark";

  // The wordmark spells the brand, so it carries the accessible name whenever it is
  // present and the icon beside it is decorative.
  const iconAlt = showWordmark ? "" : "Album";
  // The icon is square so its size map fixes both axes; the wordmark is a wide lockup and
  // must keep its aspect ratio, so only its height is pinned.
  const iconClass = `${iconSizeMap[size]} object-contain`;
  const wordmarkClass = `${wordmarkSizeMap[size]} w-auto object-contain`;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {showIcon ? (
        <>
          <Image
            src={iconLight}
            alt={iconAlt}
            priority={priority}
            aria-hidden={showWordmark || undefined}
            className={`${LIGHT_ONLY} ${iconClass}`}
          />
          <Image
            src={iconDark}
            alt={iconAlt}
            priority={priority}
            aria-hidden={showWordmark || undefined}
            className={`${DARK_ONLY} ${iconClass}`}
          />
        </>
      ) : null}

      {showWordmark ? (
        <>
          <Image
            src={wordmarkLight}
            alt="Album"
            priority={priority}
            className={`${LIGHT_ONLY} ${wordmarkClass}`}
          />
          <Image
            src={wordmarkDark}
            alt="Album"
            priority={priority}
            className={`${DARK_ONLY} ${wordmarkClass}`}
          />
        </>
      ) : null}
    </span>
  );
}
