import { NextResponse } from "next/server";

import { cloudinary, hasCloudinaryCredentials } from "@/app/lib/cloudinary";
import { supabase } from "@/app/lib/supabase";
import type { ApiResponse, Photo } from "@/app/lib/types";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/** Uploads image bytes to Cloudinary and returns its secure URL. */
async function uploadToCloudinary(file: File): Promise<string> {
  if (!hasCloudinaryCredentials) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable uploads.",
    );
  }
                                           
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "personal-album",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(new Error(error?.message ?? "Cloudinary upload failed."));
          return;
        }

        resolve(result.secure_url);
      },
    );

    uploadStream.end(buffer);
  });
}

/** Handles image upload, then stores metadata in Supabase photos table. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const albumId = String(formData.get("album_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");

  if (!albumId) {
    return NextResponse.json(
      { data: null, error: "album_id is required." } satisfies ApiResponse<null>,
      { status: 400 },
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { data: null, error: "A valid image file is required." } satisfies ApiResponse<null>,
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        data: null,
        error: "Unsupported file type. Please upload JPEG, PNG, WEBP, or HEIC.",
      } satisfies ApiResponse<null>,
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json(
      { data: null, error: "File too large. Maximum allowed size is 10MB." } satisfies ApiResponse<null>,
      { status: 413 },
    );
  }

  try {
    const uploadedUrl = await uploadToCloudinary(file);

    const { data, error } = await supabase
      .from("photos")
      .insert({
        album_id: albumId,
        url: uploadedUrl,
        title: title || null,
      })
      .select("id, album_id, url, title, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message } satisfies ApiResponse<null>,
        { status: 500 },
      );
    }

    const { count, error: countError } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("album_id", albumId);

    if (countError) {
      return NextResponse.json(
        { data: null, error: countError.message } satisfies ApiResponse<null>,
        { status: 500 },
      );
    }

    if (count === 1) {
      const { error: coverError } = await supabase
        .from("albums")
        .update({ cover_url: uploadedUrl })
        .eq("id", albumId)
        .is("cover_url", null);

      if (coverError) {
        return NextResponse.json(
          { data: null, error: coverError.message } satisfies ApiResponse<null>,
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        url: uploadedUrl,
        data: data as Photo,
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";

    return NextResponse.json(
      { data: null, error: message } satisfies ApiResponse<null>,
      { status: 500 },
    );
  }
}
