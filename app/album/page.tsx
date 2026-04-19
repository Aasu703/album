import { connection } from "next/server";
import Link from "next/link";

import AlbumCard from "@/components/AlbumCard";
import EmptyState from "@/components/EmptyState";

import AlbumForm from "./_components/AlbumForm";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { supabase } from "@/app/lib/supabase";
import type { Album } from "@/app/lib/types";

/** Renders all albums and the create-album form. */
export default async function AlbumPage() {
    await connection();

        const [{ data, error }, { data: photoRows, error: photosError }] = await Promise.all([
            supabase
                .from("albums")
        .select("id, name, cover_url, created_by, created_at")
                .order("created_at", { ascending: false }),
            supabase.from("photos").select("album_id"),
        ]);

    const baseAlbums = (data ?? []) as Album[];
        const photoCountMap = ((photoRows ?? []) as Array<{ album_id: string }>).reduce<Map<string, number>>((acc, row) => {
            const current = acc.get(row.album_id) ?? 0;
            acc.set(row.album_id, current + 1);
            return acc;
        }, new Map());

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
        photo_count: photoCountMap.get(album.id) ?? 0,
    }));

    return (
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
                        {albums.length === 0 ? (
                              <section className="rounded-3xl border border-[#E9ECEF] bg-linear-to-br from-[#F8F9FA] via-white to-[#eaf2ff] p-6 sm:p-8">
                                    <h1 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">Your memories, beautifully organized</h1>
                                    <p className="mt-2 max-w-2xl text-sm text-[#6C757D] sm:text-base">
                                            Create an album or join a party to get started.
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                            <a
                                                href="#create-album"
                                                className="inline-flex min-h-11 items-center rounded-full bg-[#4D96FF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95"
                                            >
                                                Create Album
                                            </a>
                                            <Link
                                                href="/party/create"
                                                className="inline-flex min-h-11 items-center rounded-full border border-[#E9ECEF] bg-white px-5 py-2 text-sm font-semibold text-[#1A1A2E] shadow-sm transition hover:shadow-md hover:text-[#4D96FF]"
                                            >
                                                Join a Party
                                            </Link>
                                    </div>
                            </section>
                        ) : (
                            <section className="space-y-1">
                                <h1 className="text-3xl font-bold tracking-tight text-[#1A1A2E]">Albums</h1>
                                <p className="text-sm text-[#6C757D]">Browse and manage your photo collections.</p>
                            </section>
                        )}

            <section id="create-album" className="rounded-3xl border border-[#E9ECEF] bg-white p-4 shadow-sm">
              <AlbumForm />
            </section>

            {error || usersError || photosError ? (
                <p className="rounded-xl border border-[#FF6B6B]/35 bg-[#FF6B6B]/10 p-3 text-sm text-[#a93b3b]">
                    Failed to load albums: {error?.message ?? usersError?.message ?? photosError?.message}
                </p>
            ) : null}

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {albums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                ))}
            </section>

            {!error && !usersError && albums.length === 0 ? (
                <EmptyState
                  title="No albums yet"
                  description="Create an album or join a party to get started."
                  emoji="🖼️"
                  actionLabel="Create your first album"
                  actionHref="#create-album"
                />
            ) : null}
        </main>
    );
}

