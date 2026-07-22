import type { ImageLoaderProps } from "next/image";

/**
 * next/image loader that offloads resizing/format to Cloudinary's CDN instead of
 * Next's own image optimizer. Cloudinary already serves our uploads, so letting it
 * do `f_auto,q_auto,w_<width>` means the browser fetches the finished image directly
 * (fast, edge-cached) rather than waiting on Next's server-side optimizer — which in
 * dev is slow enough (~3s/image) that Firefox aborts the request (NS_BINDING_ABORTED)
 * before it resolves. Non-Cloudinary URLs are returned untouched.
 */
export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  const marker = "/image/upload/";
  const idx = src.indexOf(marker);
  if (!src.includes("res.cloudinary.com") || idx === -1) return src;

  const transforms = ["f_auto", quality ? `q_${quality}` : "q_auto", `w_${width}`, "c_limit"].join(",");
  const insertAt = idx + marker.length;
  return `${src.slice(0, insertAt)}${transforms}/${src.slice(insertAt)}`;
}