import AlbumCard from "@/components/AlbumCard";

import AlbumForm from "./_components/AlbumForm";
import { supabase } from "@/app/lib/supabase";
import type { Album } from "@/app/lib/types";

/** Renders all albums and the create-album form. */
export default async function AlbumPage() {
    const { data, error } = await supabase
    .from("albums")
        .select("id, name, cover_url, created_at")
        .order("created_at", { ascending: false });

    const albums = (data ?? []) as Album[];

    return (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
            <section className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">My Albums</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Create albums and keep your memories organized.</p>
            </section>

            <AlbumForm />

            {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                    Failed to load albums: {error.message}
                </p>
            ) : null}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {albums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                ))}
            </section>
        </main>
    );
}

