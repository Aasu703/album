"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { REACTION_EMOJIS, type ReactionEmoji, type ReactionSummary } from "@/app/lib/types";

interface ReactionBarProps {
  artworkId: string;
  initialSummary?: ReactionSummary;
}

/** Emoji reaction picker + live counts for a single artwork. */
export default function ReactionBar({ artworkId, initialSummary }: ReactionBarProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReactionSummary | null>(initialSummary ?? null);
  const [busyEmoji, setBusyEmoji] = useState<ReactionEmoji | null>(null);

  useEffect(() => {
    if (initialSummary) return;
    let cancelled = false;
    void api.get(`/artworks/${artworkId}/reactions`).then((res) => {
      if (!cancelled) setSummary(res.data.data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworkId]);

  async function handleReact(emoji: ReactionEmoji) {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setBusyEmoji(emoji);
    try {
      if (summary?.myReaction === emoji) {
        const res = await api.delete(`/artworks/${artworkId}/reactions`);
        setSummary(res.data.data);
      } else {
        const res = await api.post(`/artworks/${artworkId}/reactions`, { emoji });
        setSummary(res.data.data);
      }
    } finally {
      setBusyEmoji(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTION_EMOJIS.map((emoji) => {
        const count = summary?.counts[emoji] ?? 0;
        const isMine = summary?.myReaction === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => void handleReact(emoji)}
            disabled={busyEmoji === emoji}
            className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors duration-300 ease-out ${
              isMine
                ? "border-accent bg-accent-soft text-accent"
                : "border-hairline bg-surface text-foreground/80 hover:border-accent/60 hover:text-accent"
            } ${isMine ? "reaction-bounce" : ""}`}
          >
            <span aria-hidden="true">{emoji}</span>
            {count > 0 ? <span>{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
