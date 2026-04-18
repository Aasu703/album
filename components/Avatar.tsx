import { getInitials } from "@/lib/avatar";

interface AvatarProps {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}

const sizeClassMap: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
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
};

/** Renders initials-based avatar with deterministic background color. */
export default function Avatar({ name, color, size = "md" }: AvatarProps) {
  const initials = getInitials(name) || "?";
  const colorClass = colorClassMap[color] ?? "bg-gray-500";

  return (
    <span
      title={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${sizeClassMap[size]} ${colorClass}`}
      aria-label={`${name} avatar`}
    >
      {initials}
    </span>
  );
}
