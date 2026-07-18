/** Whether an artwork is visible to everyone or only its owner. */
export type ArtworkVisibility = 'public' | 'private';

export interface Artwork {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  painterId: string;
  visibility: ArtworkVisibility;
  createdAt: Date;
}

export type NewArtwork = Omit<Artwork, 'id' | 'createdAt'>;
