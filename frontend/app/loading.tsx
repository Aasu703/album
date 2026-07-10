import SkeletonCard from "@/components/SkeletonCard";

/** Global loading state displayed during route segment fetch/render transitions. */
export default function RootLoading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <SkeletonCard className="h-14 w-full rounded-2xl" />
      <SkeletonCard className="h-80 w-full rounded-3xl" />
    </main>
  );
}
