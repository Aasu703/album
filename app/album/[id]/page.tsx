import { notFound } from "next/navigation";

import PhotoGrid from "@/components/PhotoGrid";

import { supabase } from "@/app/lib/supabase";
import type { Album, Photo } from "@/app/lib/types";

interface AlbumDetailPageProps {
	params: Promise<{ id: string }>;
}

/** Renders one album and all of its photos from Supabase. */
export default async function AlbumDetailPage({ params }: AlbumDetailPageProps) {
	const { id } = await params;

	const [{ data: album, error: albumError }, { data: photos, error: photosError }] =
		await Promise.all([
			supabase
				.from("albums")
				.select("id, name, cover_url, created_at")
				.eq("id", id)
				.single(),
			supabase
				.from("photos")
				.select("id, album_id, url, title, created_at")
				.eq("album_id", id)
				.order("created_at", { ascending: false }),
		]);

	if (albumError || !album) {
		notFound();
	}

	const typedAlbum = album as Album;
	const typedPhotos = (photos ?? []) as Photo[];

	return (
		<main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
			<section className="space-y-1">
				<h1 className="text-3xl font-bold tracking-tight text-slate-900">{typedAlbum.name}</h1>
				<p className="text-sm text-slate-600">
					{typedPhotos.length} {typedPhotos.length === 1 ? "photo" : "photos"}
				</p>
			</section>

			{photosError ? (
				<p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
					Failed to load photos: {photosError.message}
				</p>
			) : null}

			<PhotoGrid photos={typedPhotos} />
		</main>
	);
}
