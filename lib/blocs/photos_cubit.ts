import { Photo } from "@/app/lib/types";

export interface PhotosState {
  photos: Photo[];
  page: number;
  limit: number;
  hasMore: boolean;
  status: "initial" | "loading" | "loadingMore" | "loaded" | "error";
  error: string | null;
}

type PhotosListener = (state: PhotosState) => void;

class PhotosCubit {
  private state: PhotosState = {
    photos: [],
    page: 1,
    limit: 20,
    hasMore: true,
    status: "initial",
    error: null,
  };

  private listeners: PhotosListener[] = [];

  getState() {
    return this.state;
  }

  subscribe(listener: PhotosListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(newState: Partial<PhotosState>) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((l) => l(this.state));
  }

  async fetchPhotos(albumId?: string, userId?: string, reset = false) {
    if (reset) {
      this.emit({ photos: [], page: 1, hasMore: true, status: "loading" });
    } else if (this.state.status === "loading" || !this.state.hasMore) {
      return;
    } else if (this.state.photos.length > 0) {
      this.emit({ status: "loadingMore" });
    } else {
        this.emit({ status: "loading" });
    }

    const page = reset ? 1 : this.state.page;
    const limit = this.state.limit;

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (albumId) params.append("album_id", albumId);
      if (userId) params.append("user_id", userId);

      const response = await fetch(`/api/photos?${params.toString()}`);
      const payload = await response.json();

      if (payload.data) {
        const newPhotos = payload.data;
        const photos = reset ? newPhotos : [...this.state.photos, ...newPhotos];
        const hasMore = newPhotos.length === limit;
        this.emit({
          photos,
          page: page + 1,
          hasMore,
          status: "loaded",
          error: null,
        });
      } else {
        this.emit({ status: "error", error: payload.error || "Failed to fetch photos" });
      }
    } catch (err) {
      this.emit({ status: "error", error: "Failed to fetch photos" });
    }
  }
}

export const photosCubit = new PhotosCubit();
