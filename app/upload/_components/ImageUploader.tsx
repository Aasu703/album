"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import confetti from "canvas-confetti";

import { useIdentity } from "@/components/IdentityProvider";

interface AlbumOption {
  id: string;
  name: string;
}

interface ImageUploaderProps {
  albums: AlbumOption[];
  initialAlbumId?: string;
}

type PhotoUploadStatus = "pending" | "uploading" | "done" | "error";

interface FileWithStatus {
  id: string;
  file: File;
  preview: string;
  status: PhotoUploadStatus;
  error?: string;
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PHOTO_TITLE_LENGTH = 120;
const MAX_FILES = 20;
const FILE_INPUT_ACCEPT = "image/*,.heic,.heif";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;

/** Plays a celebratory burst after successful uploads. */
function fireConfetti() {
  confetti({
    particleCount: 140,
    spread: 85,
    origin: { y: 0.65 },
    colors: ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFC93C", "#C77DFF"],
  });
}

function truncateFilename(name: string, maxLength = 24) {
  if (name.length <= maxLength) {
    return name;
  }

  const extIndex = name.lastIndexOf(".");
  if (extIndex <= 0) {
    return `${name.slice(0, maxLength - 1)}…`;
  }

  const ext = name.slice(extIndex);
  const base = name.slice(0, extIndex);
  const available = Math.max(maxLength - ext.length - 1, 1);
  return `${base.slice(0, available)}…${ext}`;
}

function formatCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function isAcceptedFileType(file: File) {
  if (ALLOWED_TYPES.has(file.type)) {
    return true;
  }

  return !file.type && ALLOWED_EXTENSIONS.test(file.name);
}

function toQueueItem(file: File): FileWithStatus {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    preview: URL.createObjectURL(file),
    status: "pending",
  };
}

/** Upload queue UI for albums with per-file status and sequential uploads. */
export default function ImageUploader({ albums, initialAlbumId }: ImageUploaderProps) {
  const router = useRouter();
  const { identity, requestIdentity } = useIdentity();

  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState(
    initialAlbumId && albums.some((album) => album.id === initialAlbumId)
      ? initialAlbumId
      : albums[0]?.id ?? "",
  );
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragFileCount, setDragFileCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

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

  const selectedAlbumName = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId)?.name ?? "",
    [albums, selectedAlbumId],
  );

  useEffect(() => {
    if (initialAlbumId && albums.some((album) => album.id === initialAlbumId)) {
      setSelectedAlbumId(initialAlbumId);
      return;
    }

    if (!albums.some((album) => album.id === selectedAlbumId)) {
      setSelectedAlbumId(albums[0]?.id ?? "");
    }
  }, [albums, selectedAlbumId, initialAlbumId]);

  useEffect(() => {
    if (!successBanner) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuccessBanner(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [successBanner]);

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

    setSuccessBanner(null);
    setError(null);

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

    if (incoming.length > 0 && nextItems.length === 0) {
      setError("No valid photos were added.");
    }

    if (skippedByLimit > 0) {
      setError(`Maximum ${MAX_FILES} photos at a time.`);
    } else if (firstTooLargeName) {
      setError(`${firstTooLargeName} is too large (max 10MB).`);
    }

    const skippedTotal = skippedInvalidType + skippedTooLarge + skippedDuplicate + skippedByLimit;
    if (skippedTotal > 0) {
      const details: string[] = [];
      if (skippedTooLarge > 0) {
        details.push("too large");
      }
      if (skippedInvalidType > 0) {
        details.push("wrong format");
      }
      if (skippedDuplicate > 0) {
        details.push("duplicates");
      }
      if (skippedByLimit > 0) {
        details.push("over limit");
      }

      setSuccessBanner(
        `${nextItems.length} of ${incoming.length} photos added. ${skippedTotal} skipped (${details.join(", ")}).`,
      );
    }
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    addFiles(selectedFiles);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    setDragFileCount(0);

    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    const imageFiles = droppedFiles.filter((file) => file.type.startsWith("image/") || ALLOWED_EXTENSIONS.test(file.name));

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

  async function uploadAllFiles() {
    if (!selectedAlbumId) {
      setError("Please choose an album.");
      return;
    }

    if (files.length === 0) {
      setError("Please select at least one photo.");
      return;
    }

    const resolvedIdentity = identity ?? (await requestIdentity());
    if (!resolvedIdentity) {
      setError("Identity is required to upload photos.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessBanner(null);

    const startSnapshot = files.map((item) => ({ ...item, status: "pending" as PhotoUploadStatus, error: undefined }));
    setFiles(startSnapshot);

    for (let index = 0; index < startSnapshot.length; index += 1) {
      const fileItem = startSnapshot[index];
      updateFileStatus(index, "uploading");

      try {
        const formData = new FormData();
        formData.append("file", fileItem.file);
        formData.append("album_id", selectedAlbumId);
        formData.append("title", title || "");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json().catch(() => null)) as { error?: string; success?: boolean } | null;

        if (!response.ok || payload?.error || payload?.success !== true) {
          throw new Error(payload?.error ?? "Failed to upload.");
        }

        updateFileStatus(index, "done");
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : "Failed to upload.";
        updateFileStatus(index, "error", message);
      }
    }

    setIsUploading(false);

    const latestFiles = prevFilesRef.current;
    const successCount = latestFiles.filter((item) => item.status === "done").length;

    if (successCount > 0) {
      fireConfetti();
      setSuccessBanner(`${formatCountLabel(successCount, "photo", "photos")} uploaded!`);
      setTitle("");

      window.setTimeout(() => {
        router.push(`/album/${selectedAlbumId}`);
      }, 1500);
      return;
    }

    setError("All uploads failed. Please try again.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUploading) {
      return;
    }

    await uploadAllFiles();
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
          value={selectedAlbumId}
          onChange={(event) => setSelectedAlbumId(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 py-2 text-sm text-[#1A1A2E] outline-none transition focus:border-[#4D96FF]"
          disabled={isUploading}
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
          Title (optional, applies to all photos)
        </label>
        <input
          id="photo-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_PHOTO_TITLE_LENGTH}
          className="min-h-12 w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 py-2 text-sm text-[#1A1A2E] outline-none placeholder:text-[#6C757D] transition focus:border-[#4D96FF]"
          placeholder="Sunset at the beach"
          disabled={isUploading}
        />
        <p className="text-xs text-[#6C757D]">Maximum {MAX_PHOTO_TITLE_LENGTH} characters.</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-xl border p-5 text-center transition ${
          dragOver
            ? "border-[#4D96FF] bg-[#eaf2ff]"
            : "border-dashed border-[#E9ECEF] bg-[#F8F9FA]"
        }`}
      >
        <p className={`text-4xl leading-none ${dragOver ? "animate-bounce" : ""}`}>📷</p>
        <p className="mt-2 text-sm font-semibold text-[#1A1A2E]">
          {dragOver
            ? `Drop ${dragFileCount > 0 ? dragFileCount : "your"} photos here`
            : "Drag photos here or tap to select"}
        </p>
        <p className="mt-2 text-xs text-[#6C757D]">Supports JPG, PNG, WEBP, HEIC, HEIF (max 10MB each)</p>

        <label
          htmlFor="photo-file"
          className={`mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95 ${
            dragOver ? "animate-bounce bg-[#2f78ff]" : "bg-[#4D96FF] hover:shadow-md hover:brightness-95"
          }`}
        >
          Choose photos
        </label>

        <input
          id="photo-file"
          type="file"
          accept={FILE_INPUT_ACCEPT}
          multiple
          onChange={handleFilesChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E9ECEF] bg-[#F8F9FA] px-4 py-3">
        <p className="text-sm font-semibold text-[#1A1A2E]">
          {formatCountLabel(totalCount, "photo", "photos")} selected
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
        <div className="grid grid-cols-3 gap-3">
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
              <article key={item.id} className={`overflow-hidden rounded-2xl border bg-white ${statusClasses}`}>
                <div className="relative aspect-square w-full overflow-hidden bg-[#F1F3F5]">
                  <Image
                    src={item.preview}
                    alt={item.file.name}
                    fill
                    sizes="(max-width: 640px) 33vw, 180px"
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                    </div>
                  ) : null}

                  {item.status === "done" ? (
                    <div className="absolute inset-0 flex items-start justify-end p-1">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#6BCB77] text-sm font-bold text-white">
                        ✓
                      </span>
                    </div>
                  ) : null}

                  {item.status === "error" ? (
                    <div className="absolute inset-0 flex items-start justify-end p-1">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B6B] text-sm font-bold text-white"
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
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6C757D]">
                    {item.status}
                  </p>
                  {item.error ? (
                    <p className="truncate text-[10px] text-[#FF6B6B]" title={item.error}>
                      {item.error}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {totalCount > 0 ? (
        <div className="rounded-2xl border border-[#E9ECEF] bg-[#F8F9FA] px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-[#1A1A2E]">
            <span>
              Uploading {uploadedCount + failedCount} of {totalCount} photos...
            </span>
            <span>{progressPercent}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#E9ECEF]">
            <div
              className="h-full rounded-full bg-[#4D96FF] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-[#6C757D]">
            {formatCountLabel(uploadedCount, "uploaded", "uploaded")} · {formatCountLabel(uploadingCount, "uploading", "uploading")} · {formatCountLabel(pendingCount, "pending", "pending")} · {formatCountLabel(failedCount, "failed", "failed")}
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-[#FF6B6B]">{error}</p> : null}

      {successBanner ? (
        <div className="rounded-2xl border border-[#6BCB77]/35 bg-[#6BCB77]/15 p-3 text-sm font-medium text-[#2f7a3a]">
          <p>{successBanner}</p>
          {uploadedCount > 0 ? (
            <p className="mt-1 text-xs text-[#2f7a3a]">
              Album: {selectedAlbumName || "Selected album"}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isUploading || albums.length === 0 || totalCount === 0}
        className="min-h-12 w-full rounded-full bg-[#4D96FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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
