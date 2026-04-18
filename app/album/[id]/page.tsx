import { notFound } from "next/navigation";
import { connection } from "next/server";

import PhotoGrid from "@/components/PhotoGrid";

import { supabase } from "@/app/lib/supabase";
import type { Album, Photo } from "@/app/lib/types";

interface AlbumDetailPageProps {
	params: Promise<{ id: string }>;
	searchParams?: Promise<{ limit?: string }>;
}

/** Renders one album and all of its photos from Supabase. */
export default async function AlbumDetailPage({ params, searchParams }: AlbumDetailPageProps) {
	await connection();

	const { id } = await params;
	const resolvedSearchParams = (await searchParams) ?? {};
	const requestedLimit = Number.parseInt(resolvedSearchParams.limit ?? "80", 10);
	const safeLimit = Number.isFinite(requestedLimit)
		? Math.min(Math.max(requestedLimit, 1), 120)
		: 80;

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
				.limit(safeLimit)
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
				<h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{typedAlbum.name}</h1>
				<p className="text-sm text-gray-600 dark:text-gray-300">
					Showing {typedPhotos.length} {typedPhotos.length === 1 ? "photo" : "photos"}
				</p>
				<p className="text-xs text-gray-500 dark:text-gray-400">
					To avoid browser slowdowns, this page renders up to {safeLimit} photos at once.
				</p>
			</section>

			{photosError ? (
				<p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
					Failed to load photos: {photosError.message}
				</p>
			) : null}

			<PhotoGrid photos={typedPhotos} albumId={typedAlbum.id} albumName={typedAlbum.name} />
		</main>
	);
}
