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
  const { identity, requestIdentity } = useIdentity();
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

    const resolvedIdentity = identity ?? (await requestIdentity());
    if (!resolvedIdentity) {
      setError("Identity is required to upload photos.");
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
      className="space-y-3 rounded-3xl border border-[#E9ECEF] bg-white p-4 shadow-sm"
    >
      <h2 className="text-base font-semibold text-[#1A1A2E]">Upload to this party</h2>

      <div className="space-y-1">
        <label htmlFor="party-photo-title" className="text-sm font-semibold text-[#1A1A2E]">
          Title (optional)
        </label>
        <input
          id="party-photo-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          className="min-h-12 w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 py-2 text-sm text-[#1A1A2E] outline-none placeholder:text-[#6C757D] transition focus:border-[#4D96FF]"
          placeholder="Dance floor moment"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="party-photo-file" className="text-sm font-semibold text-[#1A1A2E]">
          Photo
        </label>
        <input
          id="party-photo-file"
          type="file"
          accept="image/*,.heic,.heif"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="min-h-12 w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 py-2 text-sm text-[#1A1A2E] outline-none file:mr-3 file:rounded-full file:border-0 file:bg-[#4D96FF] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
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
      {success ? <p className="text-sm text-[#2f7a3a]">{success}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="min-h-12 rounded-full bg-[#4D96FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Uploading..." : "Upload photo"}
      </button>
    </form>
  );
}
