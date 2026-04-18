"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ReactionEmoji, ReactionSummary } from "@/app/lib/types";
import { useIdentity } from "@/components/IdentityProvider";

interface ReactionBarProps {
  photoId: string;
}

const EMOJIS: ReactionEmoji[] = ["❤️", "😂", "🔥", "😮", "👏"];

/** Creates an empty reaction summary to keep rendering predictable before API data loads. */
function createEmptySummary(): ReactionSummary {
  return {
    "❤️": { count: 0, reacted: false, users: [] },
    "😂": { count: 0, reacted: false, users: [] },
    "🔥": { count: 0, reacted: false, users: [] },
    "😮": { count: 0, reacted: false, users: [] },
    "👏": { count: 0, reacted: false, users: [] },
  };
}

/** Builds a readable tooltip string from reactor names. */
function buildTooltip(users: string[]) {
  if (users.length === 0) {
    return "No reactions yet";
  }

  if (users.length === 1) {
    return users[0];
  }

  if (users.length === 2) {
    return `${users[0]}, ${users[1]}`;
  }

  const shown = users.slice(0, 2);
  const remaining = users.length - shown.length;
  return `${shown.join(", ")} and ${remaining} more`;
}

/** Displays emoji reactions with optimistic toggle behavior for the active user session. */
export default function ReactionBar({ photoId }: ReactionBarProps) {
  const { identity } = useIdentity();
  const [summary, setSummary] = useState<ReactionSummary>(createEmptySummary());
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReact = Boolean(identity);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reactions?photo_id=${encodeURIComponent(photoId)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to load reactions.");
      }

      const payload = (await response.json()) as ReactionSummary;
      setSummary(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load reactions.");
      setSummary(createEmptySummary());
    } finally {
      setLoading(false);
    }
  }, [photoId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const buttons = useMemo(
    () =>
      EMOJIS.map((emoji) => {
        const item = summary[emoji];
        return {
          emoji,
          count: item.count,
          reacted: item.reacted,
          users: item.users,
          tooltip: buildTooltip(item.users),
        };
      }),
    [summary],
  );

  async function toggleReaction(emoji: ReactionEmoji) {
    if (!canReact || isSaving) {
      return;
    }

    const previous = summary;
    const current = previous[emoji];
    const isRemoving = current.reacted;

    const optimisticUsers = isRemoving
      ? current.users.filter((name) => name !== identity?.name)
      : identity
        ? Array.from(new Set([...current.users, identity.name]))
        : current.users;

    const optimisticSummary: ReactionSummary = {
      ...previous,
      [emoji]: {
        count: Math.max(current.count + (isRemoving ? -1 : 1), 0),
        reacted: !isRemoving,
        users: optimisticUsers,
      },
    };

    setSummary(optimisticSummary);
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/reactions", {
        method: isRemoving ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photo_id: photoId,
          emoji,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to update reaction.");
      }

      const payload = (await response.json()) as ReactionSummary;
      setSummary(payload);
    } catch (saveError) {
      setSummary(previous);
      setError(saveError instanceof Error ? saveError.message : "Failed to update reaction.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {buttons.map((button) => (
          <button
            key={button.emoji}
            type="button"
            onClick={() => void toggleReaction(button.emoji)}
            disabled={isSaving || loading || !canReact}
            title={button.tooltip}
            className={`min-h-8 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              button.reacted
                ? "border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-500 dark:bg-blue-900/50 dark:text-blue-200"
                : "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <span>{button.emoji}</span>
            {button.count > 0 ? <span className="ml-1">{button.count}</span> : null}
          </button>
        ))}
      </div>

      {error ? <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}
