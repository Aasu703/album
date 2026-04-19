import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import PhotoGrid from "@/components/PhotoGrid";

import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { supabase } from "@/app/lib/supabase";
import type { Album, Photo } from "@/app/lib/types";
import { generateAvatarColor } from "@/lib/avatar";

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
				.select("id, name, cover_url, created_by, created_at")
				.eq("id", id)
				.maybeSingle(),
			supabase
				.from("photos")
				.select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
				.eq("album_id", id)
				.limit(safeLimit)
				.order("created_at", { ascending: false }),
		]);

	if (albumError || !album) {
		notFound();
	}

	const typedAlbum = album as Album;
	const typedPhotos = (photos ?? []) as Photo[];
	const admin = getSupabaseAdmin();
	const uploaderIds = Array.from(
		new Set(typedPhotos.map((photo) => photo.uploaded_by).filter((value): value is string => Boolean(value))),
	);
	const uploaderRowsResult = uploaderIds.length
		? await admin.from("users").select("id, email").in("id", uploaderIds)
		: { data: [], error: null };
	const uploaderColorMap = new Map(
		((uploaderRowsResult.data ?? []) as Array<{ id: string; email: string }>).map((row) => [
			row.id,
			generateAvatarColor(row.email),
		]),
	);
	const typedPhotosWithAvatar: Photo[] = typedPhotos.map((photo) => ({
		...photo,
		uploaded_by_avatar_color: photo.uploaded_by ? uploaderColorMap.get(photo.uploaded_by) ?? null : null,
	}));
	const { data: creator } = typedAlbum.created_by
		? await admin.from("users").select("name").eq("id", typedAlbum.created_by).maybeSingle()
		: { data: null };
	const creatorRecord = creator as { name?: string } | null;
	const creatorName = typeof creatorRecord?.name === "string" ? creatorRecord.name : "Unknown";
	const coverUrl = isAllowedRemoteImageUrl(typedAlbum.cover_url) ? typedAlbum.cover_url : null;
	const validPhotos = typedPhotosWithAvatar.filter((photo) => Boolean(photo.url));

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
			<section className="relative overflow-hidden rounded-3xl border border-[#E9ECEF] bg-white p-5 shadow-sm sm:p-7">
				{coverUrl ? (
					<div className="absolute inset-0">
						<Image
							src={coverUrl}
							alt={`${typedAlbum.name} cover`}
							fill
							sizes="100vw"
							className="object-cover blur-2xl opacity-35"
						/>
					</div>
				) : null}

				<div className="relative space-y-3">
					<h1 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">{typedAlbum.name}</h1>
					<p className="text-sm text-[#6C757D]">Created by {creatorName}</p>
					<p className="text-sm text-[#6C757D]">
						{validPhotos.length} {validPhotos.length === 1 ? "photo" : "photos"} · Created {new Date(typedAlbum.created_at).toLocaleDateString()}
					</p>

					<div className="flex flex-wrap items-center gap-2">
						<Link
							href={`/upload?album_id=${typedAlbum.id}`}
							className="inline-flex min-h-11 items-center rounded-full bg-[#4D96FF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95"
						>
							Upload to Album
						</Link>
						<a
							href="#album-photos"
							className="inline-flex min-h-11 items-center rounded-full border border-[#E9ECEF] bg-white px-5 py-2 text-sm font-semibold text-[#1A1A2E] shadow-sm transition hover:shadow-md"
						>
							Download All
						</a>
						<Link
							href={`/album/${typedAlbum.id}`}
							className="inline-flex min-h-11 items-center rounded-full border border-[#E9ECEF] bg-white px-5 py-2 text-sm font-semibold text-[#1A1A2E] shadow-sm transition hover:shadow-md"
						>
							Share
						</Link>
					</div>
				</div>
			</section>

			{photosError || uploaderRowsResult.error ? (
				<p className="rounded-xl border border-[#FF6B6B]/35 bg-[#FF6B6B]/10 p-3 text-sm text-[#a93b3b]">
					Failed to load photos: {photosError?.message ?? uploaderRowsResult.error?.message}
				</p>
			) : null}

			<section id="album-photos">
				<PhotoGrid photos={validPhotos} albumId={typedAlbum.id} albumName={typedAlbum.name} />
			</section>
		</main>
	);
}
