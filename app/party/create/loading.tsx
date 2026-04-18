/** Loading state for party creation route. */
export default function PartyCreateLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-8 sm:px-6">
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        Loading party creator...
      </div>
    </main>
  );
}
