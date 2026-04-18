import { connection } from "next/server";
import Link from "next/link";

import AlbumCard from "@/components/AlbumCard";

import AlbumForm from "./_components/AlbumForm";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { supabase } from "@/app/lib/supabase";
import type { Album } from "@/app/lib/types";

/** Renders all albums and the create-album form. */
export default async function AlbumPage() {
    await connection();

    const { data, error } = await supabase
    .from("albums")
        .select("id, name, cover_url, created_by, created_at")
        .order("created_at", { ascending: false });

    const baseAlbums = (data ?? []) as Album[];
    const creatorIds = Array.from(
        new Set(baseAlbums.map((album) => album.created_by).filter((value): value is string => Boolean(value))),
    );

    const admin = getSupabaseAdmin();

    const { data: users, error: usersError } = creatorIds.length
        ? await admin.from("users").select("id, name").in("id", creatorIds)
        : { data: [], error: null };

    const userRows = (users ?? []) as Array<{ id: string; name: string }>;
    const creatorMap = new Map(userRows.map((user) => [user.id, user.name]));

    const albums = baseAlbums.map((album) => ({
        ...album,
        created_by_name: album.created_by ? (creatorMap.get(album.created_by) ?? "Unknown") : "Unknown",
    }));

    return (
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
            <section className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">My Albums</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Create albums and keep your memories organized.</p>
            </section>

            <AlbumForm />

            {error || usersError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                    Failed to load albums: {error?.message ?? usersError?.message}
                </p>
            ) : null}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {albums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                ))}
            </section>

            {!error && !usersError && albums.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    No albums yet. Create one! <Link href="/album" className="font-semibold text-blue-600 hover:text-blue-700">Start here</Link>
                </p>
            ) : null}
        </main>
    );
}

