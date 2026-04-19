"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";

import type { ApiResponse, Photo } from "@/app/lib/types";
import { useIdentity } from "@/components/IdentityProvider";

interface AlbumOption {
  id: string;
  name: string;
}

interface ImageUploaderProps {
  albums: AlbumOption[];
  initialAlbumId?: string;
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_SIZE_MB = 10;
const MAX_PHOTO_TITLE_LENGTH = 120;
const ACCEPTED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ACCEPTED_FILE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;
const FILE_INPUT_ACCEPT = "image/*,.heic,.heif";

interface UploadSuccessResponse extends ApiResponse<Photo> {
  success: true;
  url: string;
}

/** Plays a celebratory burst after a successful upload. */
function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFC93C", "#C77DFF"],
  });
}

function isAcceptedFileType(candidate: File) {
  if (ACCEPTED_FILE_TYPES.has(candidate.type)) {
    return true;
  }

  if (!candidate.type && ACCEPTED_FILE_EXTENSIONS.test(candidate.name)) {
    return true;
  }

  return false;
}

function validateImageFile(candidate: File | null): string | null {
  if (!candidate) {
    return "Please choose an image file first.";
  }

  if (!isAcceptedFileType(candidate)) {
    return "Unsupported file type. Please upload JPEG, PNG, WEBP, or HEIC.";
  }

  if (candidate.size > MAX_UPLOAD_SIZE_BYTES) {
    return `File is too large. Maximum allowed size is ${MAX_UPLOAD_SIZE_MB}MB.`;
  }

  return null;
}

/** Lets a user choose an image and upload it to the server upload API route. */
export default function ImageUploader({ albums, initialAlbumId }: ImageUploaderProps) {
  const { identity, requestIdentity } = useIdentity();
  const [albumId, setAlbumId] = useState(initialAlbumId && albums.some((album) => album.id === initialAlbumId) ? initialAlbumId : albums[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const selectedAlbumName = useMemo(
    () => albums.find((album) => album.id === albumId)?.name ?? "",
    [albums, albumId],
  );

  useEffect(() => {
    if (initialAlbumId && albums.some((album) => album.id === initialAlbumId)) {
      setAlbumId(initialAlbumId);
      return;
    }

    if (!albums.some((album) => album.id === albumId)) {
      setAlbumId(albums[0]?.id ?? "");
    }
  }, [albums, albumId, initialAlbumId]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!successBanner) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuccessBanner(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [successBanner]);

  function setSelectedFile(nextFile: File | null) {
    const validationMessage = validateImageFile(nextFile);

    if (validationMessage) {
      setFile(null);
      setError(validationMessage);
      return;
    }

    setFile(nextFile);
    setUploadedUrl(null);
    setSuccessBanner(null);
    setError(null);
    setUploadProgress(0);
  }

  /** Captures a file selected with the hidden file input. */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setSelectedFile(selectedFile);
  }

  /** Captures a file dropped into the drag-and-drop area. */
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    setSelectedFile(droppedFile);
  }

  /** Prevents default browser behavior during drag-over events. */
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  }

  /** Handles drag leave state for visual feedback. */
  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  /** Sends selected image data to the upload API and handles response states. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setUploadProgress(0);
    setError(null);
    setSuccessBanner(null);
    setUploadedUrl(null);

    const validationMessage = validateImageFile(file);

    if (validationMessage) {
      setError(validationMessage);
      setLoading(false);
      return;
    }

    if (!file) {
      setError("Please choose an image file first.");
      setLoading(false);
      return;
    }

    const validatedFile = file;

    if (!albumId) {
      setError("Please choose an album.");
      setLoading(false);
      return;
    }

    const resolvedIdentity = identity ?? (await requestIdentity());
    if (!resolvedIdentity) {
      setError("Identity is required to upload photos.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("album_id", albumId);
    formData.append("title", title);
    formData.append("file", validatedFile);

    try {
      const payload = await new Promise<UploadSuccessResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", "/api/upload");
        xhr.responseType = "json";

        xhr.upload.onprogress = (progressEvent) => {
          if (!progressEvent.lengthComputable) {
            return;
          }

          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(percent);
        };

        xhr.onload = () => {
          const responseBody =
            typeof xhr.response === "object" && xhr.response !== null
              ? (xhr.response as Partial<UploadSuccessResponse>)
              : null;

          if (xhr.status < 200 || xhr.status >= 300 || !responseBody || responseBody.error) {
            const message =
              responseBody?.error ??
              (xhr.statusText ? `${xhr.status} ${xhr.statusText}` : "Upload failed.");
            reject(new Error(message));
            return;
          }

          if (!responseBody.success || !responseBody.url) {
            reject(new Error("Upload completed, but response payload was invalid."));
            return;
          }

          resolve(responseBody as UploadSuccessResponse);
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload."));
        };

        xhr.send(formData);
      });

      setUploadProgress(100);
      setUploadedUrl(payload.url);
      setSuccessBanner("Photo uploaded! 🎉");
      fireConfetti();
      setTitle("");
      setFile(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-3xl border border-[#E9ECEF] bg-white p-5 shadow-sm"
    >
      <div className="space-y-1">
        <label htmlFor="album-select" className="text-sm font-semibold text-[#1A1A2E]">
          Album
        </label>
        <select
          id="album-select"
          value={albumId}
          onChange={(event) => setAlbumId(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 py-2 text-sm text-[#1A1A2E] outline-none transition focus:border-[#4D96FF]"
        >
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="photo-title" className="text-sm font-semibold text-[#1A1A2E]">
          Title (optional)
        </label>
        <input
          id="photo-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_PHOTO_TITLE_LENGTH}
          className="min-h-12 w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 py-2 text-sm text-[#1A1A2E] outline-none placeholder:text-[#6C757D] transition focus:border-[#4D96FF]"
          placeholder="Sunset at the beach"
        />
        <p className="text-xs text-[#6C757D]">Maximum {MAX_PHOTO_TITLE_LENGTH} characters.</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-xl border border-dashed p-5 text-center transition ${
          isDragging
            ? "border-[#4D96FF] bg-[#eaf2ff]"
            : "border-[#E9ECEF] bg-[#F8F9FA]"
        }`}
      >
        <p className="text-sm font-semibold text-[#1A1A2E]">
          {file ? `Selected: ${file.name}` : "Drag photos here or tap to select"}
        </p>
        <p className="mt-2 text-xs text-[#6C757D]">or</p>
        <label
          htmlFor="photo-file"
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[#4D96FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95"
        >
          Click or tap to select photo
        </label>
        <p className="mt-2 text-xs text-[#6C757D]">Accepted: JPEG, PNG, WEBP, HEIC (max 10MB)</p>
        <input
          id="photo-file"
          type="file"
          accept={FILE_INPUT_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white">
            <Image
              src={previewUrl}
              alt="Selected photo preview"
              width={1000}
              height={600}
              className="h-auto w-full object-cover"
            />
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#E9ECEF] bg-[#F8F9FA] px-3 py-2">
          <div className="mb-1 flex items-center gap-2 text-sm text-[#1A1A2E]">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#4D96FF]/40 border-t-[#4D96FF]" />
            Uploading...
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#E9ECEF]">
            <div
              className="h-full rounded-full bg-[#4D96FF] transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[#6C757D]">{uploadProgress}%</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-[#FF6B6B]">{error}</p> : null}

      {successBanner ? (
        <div className="rounded-2xl border border-[#6BCB77]/35 bg-[#6BCB77]/15 p-3 text-sm font-medium text-[#2f7a3a]">
          <p>{successBanner}</p>
          <Link href={`/album/${albumId}`} className="mt-1 inline-block font-semibold underline underline-offset-2">
            Photo uploaded! View in album →
          </Link>
        </div>
      ) : null}

      {uploadedUrl ? (
        <div className="rounded-2xl border border-[#6BCB77]/35 bg-[#6BCB77]/15 p-3">
          <p className="text-sm font-medium text-[#2f7a3a]">Latest upload</p>
          <p className="mt-1 text-xs text-[#2f7a3a]">
            Album: {selectedAlbumName || "Selected album"}
          </p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#6BCB77]/35 bg-white">
            <Image
              src={uploadedUrl}
              alt="Uploaded photo thumbnail"
              width={1000}
              height={600}
              className="h-40 w-full object-cover"
            />
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading || albums.length === 0}
        className="min-h-12 w-full rounded-full bg-[#4D96FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Uploading photo..." : "Upload photo"}
      </button>
    </form>
  );
}
