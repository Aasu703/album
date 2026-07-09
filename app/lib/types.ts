export interface Album {
  id: string;
  name: string;
  cover_url: string | null;
  created_by: string | null;
  created_by_name?: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  album_id: string;
  url: string;
  title: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  uploaded_by_avatar_color?: string | null;
  created_at: string;
}

export interface UserIdentity {
  id: string;
  name: string;
  email: string | null;
  avatarColor: string;
  isGuest?: boolean;
  guestId?: string | null;
}

export interface PartyMember {
  user_id: string;
  user_name: string;
  avatar_color: string;
}

export interface Party {
  id: string;
  name: string;
  description: string | null;
  host_id: string;
  host_name: string;
  join_code: string;
  album_id: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface PartyWithJoinUrl extends Party {
  join_url: string;
  members?: PartyMember[];
}

export type ReactionEmoji = "❤️" | "😂" | "🔥" | "😮" | "👏";

export interface ReactionGroup {
  count: number;
  reacted: boolean;
  users: string[];
}

export type ReactionSummary = Record<ReactionEmoji, ReactionGroup>;

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface AdminRecentAlbum {
  id: string;
  name: string;
  created_at: string;
  created_by_name: string | null;
}

export interface AdminRecentPhoto {
  id: string;
  title: string | null;
  url: string;
  created_at: string;
  album_name: string | null;
  uploaded_by_name: string | null;
}

export interface AdminStats {
  total_albums: number;
  total_photos: number;
  total_users: number;
  total_parties: number;
  recent_albums: AdminRecentAlbum[];
  recent_photos: AdminRecentPhoto[];
}

export interface AdminAlbumRow extends Album {
  photo_count: number;
  photo_urls: string[];
}

export interface AdminPhotoRow extends Photo {
  album_name: string | null;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
  album_count: number;
  photo_count: number;
}

export interface AdminPartyRow extends Party {
  member_count: number;
}
