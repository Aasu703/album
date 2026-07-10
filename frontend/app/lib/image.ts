/** Returns true when the URL matches configured Next Image remote patterns. */
export function isAllowedRemoteImageUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

/**
 * Returns a Cloudinary delivery URL with auto format/quality to avoid HEIC decode failures.
 * Keeps the original URL when no transformation can be safely applied.
 */
export function toDisplayImageUrl(value: string | null | undefined): string | null {
  if (!isAllowedRemoteImageUrl(value)) {
    return null;
  }

  try {
    const parsed = new URL(value);

    if (!parsed.pathname.includes("/image/upload/")) {
      return parsed.toString();
    }

    if (parsed.pathname.includes("/image/upload/f_auto,q_auto/")) {
      return parsed.toString();
    }

    parsed.pathname = parsed.pathname.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
    return parsed.toString();
  } catch {
    return value;
  }
}
