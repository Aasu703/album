"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";

import type { ApiResponse, Photo } from "@/app/lib/types";

interface AlbumOption {
  id: string;
  name: string;
}

interface ImageUploaderProps {
  albums: AlbumOption[];
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_SIZE_MB = 10;
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
export default function ImageUploader({ albums }: ImageUploaderProps) {
  const [albumId, setAlbumId] = useState(albums[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedAlbumName = useMemo(
    () => albums.find((album) => album.id === albumId)?.name ?? "",
    [albums, albumId],
  );

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

  function setSelectedFile(nextFile: File | null) {
    const validationMessage = validateImageFile(nextFile);

    if (validationMessage) {
      setFile(null);
      setError(validationMessage);
      return;
    }

    setFile(nextFile);
    setUploadedUrl(null);
    setSuccess(null);
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
    setSuccess(null);
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
      setSuccess("Photo uploaded successfully.");
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
      className="w-full space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="space-y-1">
        <label htmlFor="album-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Album
        </label>
        <select
          id="album-select"
          value={albumId}
          onChange={(event) => setAlbumId(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        >
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="photo-title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Title (optional)
        </label>
        <input
          id="photo-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
          placeholder="Sunset at the beach"
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-xl border border-dashed p-5 text-center transition ${
          isDragging
            ? "border-gray-500 bg-gray-100 dark:border-gray-500 dark:bg-gray-800"
            : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-950"
        }`}
      >
        <p className="text-sm text-gray-700 dark:text-gray-200">
          {file ? `Selected: ${file.name}` : "Drag and drop an image here (desktop)"}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">or</p>
        <label
          htmlFor="photo-file"
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-gray-100 dark:text-gray-900"
        >
          Click or tap to select photo
        </label>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Accepted: JPEG, PNG, WEBP, HEIC (max 10MB)</p>
        <input
          id="photo-file"
          type="file"
          accept={FILE_INPUT_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
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
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-950">
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-700 dark:border-t-gray-200" />
            Uploading...
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-gray-800 transition-all dark:bg-gray-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{uploadProgress}%</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {success && uploadedUrl ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/50">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{success}</p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            Album: {selectedAlbumName || "Selected album"}
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-emerald-200 bg-white dark:border-emerald-900 dark:bg-gray-900">
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
        className="min-h-11 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
      >
        {loading ? "Uploading photo..." : "Upload photo"}
      </button>
    </form>
  );
}
