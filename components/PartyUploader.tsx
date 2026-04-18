"use client";

import { FormEvent, useState } from "react";

import type { ApiResponse, Photo } from "@/app/lib/types";
import { useIdentity } from "@/components/IdentityProvider";

interface PartyUploaderProps {
  joinCode: string;
  onUploaded?: () => void;
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

interface UploadResponse extends ApiResponse<Photo> {
  success?: boolean;
  url?: string;
  warning?: string | null;
}

/** Uploads party photos with progress and robust client-side validation. */
export default function PartyUploader({ joinCode, onUploaded }: PartyUploaderProps) {
  const { identity } = useIdentity();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function validateSelectedFile(candidate: File | null) {
    if (!candidate) {
      return "Please choose an image file first.";
    }

    if (!ACCEPTED_TYPES.has(candidate.type)) {
      return "Unsupported file type. Please upload JPEG, PNG, WEBP, or HEIC.";
    }

    if (candidate.size > MAX_UPLOAD_SIZE_BYTES) {
      return "File too large. Maximum allowed size is 10MB.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (!identity) {
      setError("Please set your identity first.");
      return;
    }

    const validationError = validateSelectedFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const selectedFile = file;
    if (!selectedFile) {
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("party_join_code", joinCode);
    formData.append("title", title);
    formData.append("user_id", identity.id);
    formData.append("user_name", identity.name);
    formData.append("user_email", identity.email);
    formData.append("file", selectedFile);

    try {
      const payload = await new Promise<UploadResponse>((resolve, reject) => {
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
              ? (xhr.response as Partial<UploadResponse>)
              : null;

          if (xhr.status < 200 || xhr.status >= 300 || !responseBody || responseBody.error) {
            reject(new Error(responseBody?.error ?? "Upload failed."));
            return;
          }

          if (!responseBody.data) {
            reject(new Error("Upload completed, but response payload was invalid."));
            return;
          }

          resolve(responseBody as UploadResponse);
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload."));
        };

        xhr.send(formData);
      });

      setUploadProgress(100);
      setSuccess(payload.warning ?? "Photo uploaded successfully.");
      setTitle("");
      setFile(null);
      onUploaded?.();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Upload to this party</h2>

      <div className="space-y-1">
        <label htmlFor="party-photo-title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Title (optional)
        </label>
        <input
          id="party-photo-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
          placeholder="Dance floor moment"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="party-photo-file" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Photo
        </label>
        <input
          id="party-photo-file"
          type="file"
          accept="image/*,.heic,.heif"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:file:bg-blue-600 dark:file:text-white"
        />
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

      {error ? <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="min-h-11 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Uploading..." : "Upload photo"}
      </button>
    </form>
  );
}
