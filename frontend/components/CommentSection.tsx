"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { Comment, CommentAuthor } from "@/app/lib/types";

interface CommentSectionProps {
  artworkId: string;
}

function authorName(authorId: Comment["authorId"]): string {
  if (typeof authorId === "string") return "Someone";
  const author = authorId as CommentAuthor;
  return `${author.firstName} ${author.lastName}`;
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Failed to post comment.";
}

/** Comment thread for an artwork: list + add + (author/admin) delete.
 * Comment text is always rendered as plain text content below (never HTML),
 * which is what actually neutralizes stored-XSS payloads in user comments. */
export default function CommentSection({ artworkId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await api.get(`/artworks/${artworkId}/comments`);
      setComments(res.data.data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworkId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    if (!text.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/artworks/${artworkId}/comments`, { text: text.trim() });
      setText("");
      await fetchComments();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    await api.delete(`/comments/${commentId}`);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Comments</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder={user ? "Share your thoughts..." : "Log in to comment"}
          disabled={!user}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 p-3 text-sm text-gray-100 outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="self-end rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post comment"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet. Be the first to say something.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const canDelete =
              user &&
              (user.role === "ADMIN" ||
                (typeof comment.authorId === "object" && comment.authorId.id === user.id));
            return (
              <li key={comment.id} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{authorName(comment.authorId)}</p>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(comment.id)}
                      className="text-xs font-semibold text-gray-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                {/* Rendered as plain text content, not HTML, so no stored payload can execute. */}
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-300">{comment.text}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
