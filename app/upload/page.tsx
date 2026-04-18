import { connection } from "next/server";

import ImageUploader from "./_components/ImageUploader";
import { supabase } from "@/app/lib/supabase";

/** Renders upload form and passes available albums to the client uploader. */
export default async function UploadPage() {
    await connection();

    const { data, error } = await supabase
        .from("albums")
        .select("id, name")
        .order("created_at", { ascending: false });

    const albums = (data ?? []) as { id: string; name: string }[];

    return (
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
            <section className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Upload Photo</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Choose an album and upload your photo to Cloudinary.</p>
            </section>

            {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                    Failed to load albums: {error.message}
                </p>
            ) : null}

            {albums.length === 0 ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                    Create an album first before uploading photos.
                </p>
            ) : (
                <ImageUploader albums={albums} />
            )}
        </main>
    );
}