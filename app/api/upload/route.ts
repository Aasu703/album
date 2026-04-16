import { NextResponse } from "next/server";

import { cloudinary, hasCloudinaryCredentials } from "@/app/lib/cloudinary";
import { supabase } from "@/app/lib/supabase";
import type { ApiResponse, Photo } from "@/app/lib/types";

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

    return NextResponse.json(
      { data: data as Photo, error: null } satisfies ApiResponse<Photo>,
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
