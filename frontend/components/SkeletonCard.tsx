interface SkeletonCardProps {
  className?: string;
}

/** Lightweight skeleton block for cards and media placeholders. */
export default function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return <div className={`animate-pulse rounded-2xl bg-[#E9ECEF] ${className}`.trim()} />;
}
