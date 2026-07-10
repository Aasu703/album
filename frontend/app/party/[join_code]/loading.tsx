import SkeletonCard from "@/components/SkeletonCard";

/** Loading state for shared party album route. */
export default function PartyAlbumLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <SkeletonCard className="h-52 w-full rounded-3xl" />
      <SkeletonCard className="h-44 w-full rounded-3xl" />
      <div className="columns-2 gap-3 md:columns-3 xl:columns-4 [column-fill:balance]">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonCard key={index} className="mb-3 h-44 w-full" />
        ))}
      </div>
    </main>
  );
}
