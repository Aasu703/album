import SkeletonCard from "@/components/SkeletonCard";

/** Loading state for album listing route. */
export default function AlbumLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <SkeletonCard className="h-32 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonCard key={index} className="aspect-square w-full" />
        ))}
      </div>
    </main>
  );
}
