/** Shows a pulsing live indicator for auto-refreshing party feeds. */
export default function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
      </span>
      Live
    </span>
  );
}
