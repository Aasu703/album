export type UserRole = "USER" | "VERIFIED_ARTIST" | "ADMIN";
export type SellerStatus = "none" | "pending" | "approved" | "rejected";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  sellerStatus: SellerStatus;
  isBanned: boolean;
  isMfaEnabled: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface ArtworkPainter {
  id: string;
  firstName: string;
  lastName: string;
}

export type ArtworkVisibility = "public" | "private";

export interface Artwork {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  painterId: string | ArtworkPainter;
  visibility?: ArtworkVisibility;
  createdAt: string;
}

/** A comment left by the current user, with its artwork populated for linking back. */
export interface MyComment {
  id: string;
  text: string;
  createdAt: string;
  artworkId:
    | string
    | {
        id: string;
        title: string;
        imageUrl: string;
        visibility?: ArtworkVisibility;
      };
}

export interface ArtworkListResult {
  items: Artwork[];
  total: number;
  page: number;
  limit: number;
}

export const REACTION_EMOJIS = ["❤️", "🔥", "👏", "😍", "🎨"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface ReactionSummary {
  counts: Record<string, number>;
  total: number;
  myReaction: ReactionEmoji | null;
}

export interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Comment {
  id: string;
  artworkId: string;
  authorId: string | CommentAuthor;
  text: string;
  createdAt: string;
}


export interface CommentListResult {
  items: Comment[];
  total: number;
  page: number;
  limit: number;
}
