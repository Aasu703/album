export type ListingType = 'SOCIAL_ONLY' | 'FOR_SALE' | 'AUCTION';

export interface Artwork {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  painterId: string;
  listingType: ListingType;
  price?: number;
  createdAt: Date;
}

export type NewArtwork = Omit<Artwork, 'id' | 'createdAt'>;
