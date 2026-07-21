import Image from "next/image";

import { getInitials } from "@/lib/avatar";

interface AvatarProps {
  name: string;
  color?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  neutral?: boolean;
  /** Uploaded profile picture; falls back to initials when absent. */
  src?: string | null;
}

const sizeClassMap: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-24 w-24 text-3xl",
};

const sizePixelMap: Record<NonNullable<AvatarProps["size"]>, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 96,
};

const colorClassMap: Record<string, string> = {
  "#FF6B6B": "bg-[#FF6B6B]",
  "#FF8E53": "bg-[#FF8E53]",
  "#FFC93C": "bg-[#FFC93C]",
  "#6BCB77": "bg-[#6BCB77]",
  "#4D96FF": "bg-[#4D96FF]",
  "#C77DFF": "bg-[#C77DFF]",
  "#FF6FD8": "bg-[#FF6FD8]",
  "#00C9A7": "bg-[#00C9A7]",
  "#F72585": "bg-[#F72585]",
  "#4361EE": "bg-[#4361EE]",
  "#FB5607": "bg-[#FB5607]",
  "#3A86FF": "bg-[#3A86FF]",
  "#6C757D": "bg-[#6C757D]",
};

/** Renders initials-based avatar with deterministic background color. */
export default function Avatar({ name, color, size = "md", neutral = false, src }: AvatarProps) {
  const initials = getInitials(name) || "?";
  const colorClass = neutral ? "bg-[#E9ECEF]" : colorClassMap[color ?? ""] ?? "bg-[#6C757D]";
  const textClass = neutral ? "text-[#6C757D]" : "text-white";

  if (src) {
    const px = sizePixelMap[size];
    return (
      <Image
        src={src}
        alt={`${name} avatar`}
        title={name}
        width={px}
        height={px}
        className={`inline-block shrink-0 rounded-full object-cover ${sizeClassMap[size]}`}
      />
    );
  }

  return (
    <span
      title={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold tracking-wide ${sizeClassMap[size]} ${colorClass} ${textClass}`}
      aria-label={`${name} avatar`}
    >
      {initials}
    </span>
  );
}
