export interface Album {
  id: string;
  name: string;
  cover_url: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  album_id: string;
  url: string;
  title: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
