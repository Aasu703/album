import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
}

/** Displays a compact metric block for admin dashboard totals. */
export default function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
    </article>
  );
}
