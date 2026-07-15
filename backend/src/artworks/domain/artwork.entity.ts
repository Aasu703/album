export type ListingType = 'SOCIAL_ONLY' | 'FOR_SALE' | 'AUCTION';
export type ArtworkStatus = 'AVAILABLE' | 'SOLD';

export interface Artwork {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  painterId: string;
  listingType: ListingType;
  price?: number;

  // Auction specific fields
  currentHighestBid?: number;
  bidderId?: string;
  auctionEndTime?: Date;

  status: ArtworkStatus;
  createdAt: Date;
}

export type NewArtwork = Omit<Artwork, 'id' | 'createdAt'>;
