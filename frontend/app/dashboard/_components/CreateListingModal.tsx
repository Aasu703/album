"use client";

import ArtworkUploadForm from "@/components/ArtworkUploadForm";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/** Modal wrapper around the shared artwork upload form, launched from the dashboard. */
export default function CreateListingModal({ isOpen, onClose, onCreated }: CreateListingModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-hairline bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-foreground">Post a painting</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition-colors duration-300 ease-out hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <ArtworkUploadForm
          onCreated={() => {
            onCreated();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
