import SkeletonCard from "@/components/SkeletonCard";

/** Loading state for album detail route. */
export default function AlbumDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <SkeletonCard className="h-52 w-full rounded-3xl" />
      <SkeletonCard className="h-14 w-full rounded-2xl" />
      <div className="columns-2 gap-3 md:columns-3 xl:columns-4 [column-fill:balance]">
        {Array.from({ length: 10 }).map((_, index) => (
          <SkeletonCard key={index} className="mb-3 h-48 w-full" />
        ))}
      </div>
    </main>
  );
}
