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
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-surface p-5 shadow-xl">
        <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>

        {warning ? (
          <p className="mt-3 rounded-2xl border border-warning/40 bg-warning/15 p-3 text-sm text-warning">{warning}</p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="min-h-11 rounded-full border border-hairline bg-surface-raised px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="min-h-11 rounded-full bg-danger px-4 py-2 text-sm font-semibold text-background shadow-sm transition-colors duration-300 ease-out hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
