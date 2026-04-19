import SkeletonCard from "@/components/SkeletonCard";

/** Loading state for party creation route. */
export default function PartyCreateLoading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <SkeletonCard className="h-14 w-80" />
      <SkeletonCard className="h-96 w-full rounded-3xl" />
    </main>
  );
}
