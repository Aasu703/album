export interface Artwork {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  painterId: string;
  createdAt: Date;
}

export type NewArtwork = Omit<Artwork, 'id' | 'createdAt'>;
