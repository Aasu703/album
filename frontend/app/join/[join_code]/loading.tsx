import SkeletonCard from "@/components/SkeletonCard";

/** Loading state for party join landing route. */
export default function JoinPartyLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8 sm:px-6">
      <SkeletonCard className="h-72 w-full max-w-2xl rounded-3xl" />
    </main>
  );
}
