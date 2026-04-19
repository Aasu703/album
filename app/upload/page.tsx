import { connection } from "next/server";

import EmptyState from "@/components/EmptyState";
import ImageUploader from "./_components/ImageUploader";
import { supabase } from "@/app/lib/supabase";

interface UploadPageProps {
    searchParams?: Promise<{ album_id?: string }>;
}

/** Renders upload form and passes available albums to the client uploader. */
export default async function UploadPage({ searchParams }: UploadPageProps) {
    await connection();

    const resolvedSearchParams = (await searchParams) ?? {};
    const initialAlbumId = typeof resolvedSearchParams.album_id === "string" ? resolvedSearchParams.album_id : "";

    const { data, error } = await supabase
        .from("albums")
        .select("id, name")
        .order("created_at", { ascending: false });

    const albums = (data ?? []) as { id: string; name: string }[];

    return (
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
            <section className="mx-auto w-full max-w-3xl space-y-1 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-[#1A1A2E]">Drop your next favorite shot</h1>
                <p className="text-sm text-[#6C757D]">Drag photos here or tap to select. Uploads go live instantly.</p>
            </section>

            {error ? (
                <p className="mx-auto w-full max-w-3xl rounded-xl border border-[#FF6B6B]/35 bg-[#FF6B6B]/10 p-3 text-sm text-[#a93b3b]">
                    Failed to load albums: {error.message}
                </p>
            ) : null}

            {albums.length === 0 ? (
                <EmptyState
                  title="No albums available"
                  description="Create an album first, then come back to upload your photos."
                  emoji="🧺"
                  actionLabel="Create Album"
                  actionHref="/album"
                />
            ) : (
                <section className="mx-auto w-full max-w-3xl">
                    <ImageUploader albums={albums} initialAlbumId={initialAlbumId} />
                </section>
            )}
        </main>
    );
}