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
  created_at: string;
}

export interface UserIdentity {
  id: string;
  name: string;
  email: string;
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
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
