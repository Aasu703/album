/** Shows a pulsing live indicator for auto-refreshing party feeds. */
export default function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#6BCB77]/40 bg-[#6BCB77]/15 px-2.5 py-1 text-xs font-semibold text-[#2f7a3a]">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6BCB77] opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-[#6BCB77]" />
      </span>
      Live
    </span>
  );
}
