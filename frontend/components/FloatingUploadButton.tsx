"use client";

interface FloatingUploadButtonProps {
  onClick: () => void;
  label?: string;
}

/** Fixed-position mobile-first upload action button for party pages. */
export default function FloatingUploadButton({ onClick, label = "Upload" }: FloatingUploadButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-5 right-5 z-40 inline-flex min-h-14 items-center gap-2 rounded-full bg-[#4D96FF] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-95 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D96FF] md:hidden"
    >
      <span aria-hidden="true">📷</span>
      {label}
    </button>
  );
}
