"use client";

import Image from "next/image";
import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

import type { ApiResponse, Photo } from "@/app/lib/types";
import { useIdentity } from "@/components/IdentityProvider";

type PhotoUploadStatus = "pending" | "uploading" | "done" | "error";

interface FileWithStatus {
  id: string;
  file: File;
  preview: string;
  status: PhotoUploadStatus;
  error?: string;
}

interface PartyUploaderProps {
  joinCode: string;
  onUploaded?: () => void;
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 20;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ACCEPTED_FILE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;

interface UploadResponse extends ApiResponse<Photo> {
  success?: boolean;
  url?: string;
  warning?: string | null;
}

function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 75,
    origin: { y: 0.62 },
    colors: ["#4D96FF", "#6BCB77", "#FFC93C", "#FF6B6B"],
  });
}

function truncateFilename(name: string, maxLength = 22) {
  if (name.length <= maxLength) {
    return name;
  }

  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) {
    return `${name.slice(0, maxLength - 1)}…`;
  }

  const ext = name.slice(dotIndex);
  const base = name.slice(0, dotIndex);
  const available = Math.max(maxLength - ext.length - 1, 1);
  return `${base.slice(0, available)}…${ext}`;
}

function toQueueItem(file: File): FileWithStatus {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    preview: URL.createObjectURL(file),
    status: "pending",
  };
}

function isAcceptedFileType(candidate: File) {
  if (ACCEPTED_TYPES.has(candidate.type)) {
    return true;
  }

  return !candidate.type && ACCEPTED_FILE_EXTENSIONS.test(candidate.name);
}

/** Uploads party photos sequentially with per-file status and queue UI. */
export default function PartyUploader({ joinCode, onUploaded }: PartyUploaderProps) {
  const { identity, requestIdentity } = useIdentity();
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragFileCount, setDragFileCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const prevFilesRef = useRef<FileWithStatus[]>([]);

  const uploadedCount = files.filter((file) => file.status === "done").length;
  const failedCount = files.filter((file) => file.status === "error").length;
  const pendingCount = files.filter((file) => file.status === "pending").length;
  const uploadingCount = files.filter((file) => file.status === "uploading").length;
  const totalCount = files.length;
  const progressPercent =
    totalCount > 0
      ? Math.round(((uploadedCount + failedCount) / totalCount) * 100)
      : 0;

  useEffect(() => {
    const previous = prevFilesRef.current;
    const currentPreviewSet = new Set(files.map((file) => file.preview));

    for (const item of previous) {
      if (!currentPreviewSet.has(item.preview)) {
        URL.revokeObjectURL(item.preview);
      }
    }

    prevFilesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      for (const item of prevFilesRef.current) {
        URL.revokeObjectURL(item.preview);
      }
    };
  }, []);

  function updateFileStatus(index: number, status: PhotoUploadStatus, message?: string) {
    setFiles((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          status,
          error: message,
        };
      }),
    );
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function clearAllFiles() {
    setFiles([]);
    setError(null);
  }

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) {
      return;
    }

    setError(null);
    setSuccess(null);

    const duplicateKeySet = new Set(files.map((item) => `${item.file.name}::${item.file.size}`));
    const nextItems: FileWithStatus[] = [];

    let skippedInvalidType = 0;
    let skippedTooLarge = 0;
    let skippedDuplicate = 0;
    let skippedByLimit = 0;
    let firstTooLargeName: string | null = null;

    for (const candidate of incoming) {
      if (nextItems.length + files.length >= MAX_FILES) {
        skippedByLimit += 1;
        continue;
      }

      const duplicateKey = `${candidate.name}::${candidate.size}`;
      if (duplicateKeySet.has(duplicateKey)) {
        skippedDuplicate += 1;
        continue;
      }

      if (!isAcceptedFileType(candidate)) {
        skippedInvalidType += 1;
        continue;
      }

      if (candidate.size > MAX_UPLOAD_SIZE_BYTES) {
        skippedTooLarge += 1;
        if (!firstTooLargeName) {
          firstTooLargeName = candidate.name;
        }
        continue;
      }

      duplicateKeySet.add(duplicateKey);
      nextItems.push(toQueueItem(candidate));
    }

    if (nextItems.length > 0) {
      setFiles((current) => [...current, ...nextItems]);
    }

    const skippedTotal = skippedInvalidType + skippedTooLarge + skippedDuplicate + skippedByLimit;
    if (skippedTotal > 0) {
      const reasons: string[] = [];
      if (skippedTooLarge > 0) {
        reasons.push("too large");
      }
      if (skippedInvalidType > 0) {
        reasons.push("wrong format");
      }
      if (skippedDuplicate > 0) {
        reasons.push("duplicates");
      }
      if (skippedByLimit > 0) {
        reasons.push("over limit");
      }

      setSuccess(`${nextItems.length} of ${incoming.length} photos added. ${skippedTotal} skipped (${reasons.join(", ")}).`);
    }

    if (skippedByLimit > 0) {
      setError(`Maximum ${MAX_FILES} photos at a time.`);
    } else if (firstTooLargeName) {
      setError(`${firstTooLargeName} is too large (max 10MB).`);
    }

    if (incoming.length > 0 && nextItems.length === 0) {
      setError("No valid photos were added.");
    }
  }

  function handleFilesChange(fileList: FileList | null) {
    addFiles(Array.from(fileList ?? []));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    setDragFileCount(0);

    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    const imageFiles = droppedFiles.filter((file) => file.type.startsWith("image/") || ACCEPTED_FILE_EXTENSIONS.test(file.name));

    if (imageFiles.length === 0) {
      setError("Please drop image files only.");
      return;
    }

    addFiles(imageFiles);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!dragOver) {
      setDragOver(true);
    }

    setDragFileCount(event.dataTransfer.items.length || event.dataTransfer.files.length || 0);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    setDragFileCount(0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploading) {
      return;
    }

    if (files.length === 0) {
      setError("Please choose at least one image file first.");
      return;
    }

    const resolvedIdentity = identity ?? (await requestIdentity());
    if (!resolvedIdentity) {
      setError("Identity is required to upload photos.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const startSnapshot = files.map((item) => ({ ...item, status: "pending" as PhotoUploadStatus, error: undefined }));
    setFiles(startSnapshot);

    for (let index = 0; index < startSnapshot.length; index += 1) {
      const fileItem = startSnapshot[index];
      updateFileStatus(index, "uploading");

      const formData = new FormData();
      formData.append("party_join_code", joinCode);
      formData.append("title", title || "");
      formData.append("file", fileItem.file);

      try {
        const payload = await new Promise<UploadResponse>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.open("POST", "/api/upload");
          xhr.responseType = "json";

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

        updateFileStatus(index, "done");

        if (payload.warning && process.env.NODE_ENV !== "production") {
          console.warn(payload.warning);
        }
      } catch (uploadError) {
        updateFileStatus(index, "error", uploadError instanceof Error ? uploadError.message : "Upload failed.");
      }
    }

    setIsUploading(false);

    const latestFiles = prevFilesRef.current;
    const successCount = latestFiles.filter((item) => item.status === "done").length;

    if (successCount > 0) {
      fireConfetti();
      setSuccess(`${successCount} ${successCount === 1 ? "photo" : "photos"} uploaded successfully.`);
      setTitle("");
      onUploaded?.();
      return;
    }

    setError("All uploads failed. Please try again.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-3xl border border-[#E9ECEF] bg-white p-4 shadow-sm"
    >
      <h2 className="text-base font-semibold text-[#1A1A2E]">Upload to this party</h2>

      <div className="space-y-1">
        <label htmlFor="party-photo-title" className="text-sm font-semibold text-[#1A1A2E]">
          Title (optional, applies to all photos)
        </label>
        <input
          id="party-photo-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          className="min-h-12 w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 py-2 text-sm text-[#1A1A2E] outline-none placeholder:text-[#6C757D] transition focus:border-[#4D96FF]"
          placeholder="Dance floor moment"
          disabled={isUploading}
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-xl border p-4 text-center transition ${
          dragOver ? "border-[#4D96FF] bg-[#eaf2ff]" : "border-dashed border-[#E9ECEF] bg-[#F8F9FA]"
        }`}
      >
        <p className={`text-3xl leading-none ${dragOver ? "animate-bounce" : ""}`}>⬆️</p>
        <p className="text-sm font-semibold text-[#1A1A2E]">
          {dragOver
            ? `Drop ${dragFileCount > 0 ? dragFileCount : "your"} photos here`
            : "Drag photos here or tap to select"}
        </p>
        <label
          htmlFor="party-photo-file"
          className={`mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
            dragOver ? "animate-bounce bg-[#2f78ff]" : "bg-[#4D96FF] hover:shadow-md hover:brightness-95"
          }`}
        >
          Choose photos
        </label>
        <input
          id="party-photo-file"
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          onChange={(event) => {
            handleFilesChange(event.target.files);
            event.target.value = "";
          }}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E9ECEF] bg-[#F8F9FA] px-3 py-2">
        <p className="text-sm font-semibold text-[#1A1A2E]">
          {totalCount} {totalCount === 1 ? "photo" : "photos"} selected
        </p>
        <button
          type="button"
          onClick={clearAllFiles}
          disabled={isUploading || totalCount === 0}
          className="rounded-full border border-[#E9ECEF] bg-white px-3 py-1 text-xs font-semibold text-[#1A1A2E] transition hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear all
        </button>
      </div>

      {totalCount > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {files.map((item, index) => {
            const statusClasses =
              item.status === "uploading"
                ? "border-[#4D96FF]"
                : item.status === "done"
                  ? "border-[#6BCB77]"
                  : item.status === "error"
                    ? "border-[#FF6B6B]"
                    : "border-[#E9ECEF]";

            return (
              <article key={item.id} className={`overflow-hidden rounded-xl border bg-white ${statusClasses}`}>
                <div className="relative aspect-square w-full overflow-hidden bg-[#F1F3F5]">
                  <Image
                    src={item.preview}
                    alt={item.file.name}
                    fill
                    sizes="(max-width: 640px) 33vw, 160px"
                    className="object-cover"
                    unoptimized
                  />

                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                    className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Remove ${item.file.name}`}
                  >
                    ×
                  </button>

                  {item.status === "uploading" ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    </div>
                  ) : null}

                  {item.status === "done" ? (
                    <div className="absolute inset-0 flex items-start justify-end p-1">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#6BCB77] text-xs font-bold text-white">
                        ✓
                      </span>
                    </div>
                  ) : null}

                  {item.status === "error" ? (
                    <div className="absolute inset-0 flex items-start justify-end p-1">
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B6B] text-xs font-bold text-white"
                        title={item.error ?? "Failed to upload"}
                      >
                        ✕
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1 p-2">
                  <p className="truncate text-[11px] font-medium text-[#1A1A2E]" title={item.file.name}>
                    {truncateFilename(item.file.name)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6C757D]">{item.status}</p>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {totalCount > 0 ? (
        <div className="rounded-2xl border border-[#E9ECEF] bg-[#F8F9FA] px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-[#1A1A2E]">
            <span>
              Uploading {uploadedCount + failedCount} of {totalCount} photos...
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#E9ECEF]">
            <div className="h-full rounded-full bg-[#4D96FF] transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-1 text-xs text-[#6C757D]">
            {uploadedCount} uploaded · {uploadingCount} uploading · {pendingCount} pending · {failedCount} failed
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-[#FF6B6B]">{error}</p> : null}
      {success ? <p className="text-sm text-[#2f7a3a]">{success}</p> : null}

      <button
        type="submit"
        disabled={isUploading || totalCount === 0}
        className="min-h-12 rounded-full bg-[#4D96FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
            Uploading...
          </span>
        ) : (
          `Upload ${totalCount} ${totalCount === 1 ? "Photo" : "Photos"}`
        )}
      </button>
    </form>
  );
}
