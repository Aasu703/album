"use client";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Reusable confirmation modal for destructive actions across the app. */
export default function ConfirmModal({
  isOpen,
  title,
  description,
  warning,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isBusy = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl border border-[#E9ECEF] bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-[#1A1A2E]">{title}</h2>
        <p className="mt-2 text-sm text-[#6C757D]">{description}</p>

        {warning ? (
          <p className="mt-3 rounded-2xl border border-[#FFC93C]/40 bg-[#FFC93C]/20 p-3 text-sm text-[#8a6a14]">{warning}</p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="min-h-11 rounded-full border border-[#E9ECEF] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A2E] transition hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="min-h-11 rounded-full bg-[#FF6B6B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
