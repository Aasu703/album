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
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export type ListingType = "SOCIAL_ONLY" | "FOR_SALE" | "AUCTION";
export type ArtworkStatus = "AVAILABLE" | "SOLD";

export interface ArtworkPainter {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Artwork {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  painterId: string | ArtworkPainter;
  listingType: ListingType;
  price?: number;
  currentHighestBid?: number;
  bidderId?: string | ArtworkPainter;
  auctionEndTime?: string;
  status: ArtworkStatus;
  createdAt: string;
}

export interface ArtworkListResult {
  items: Artwork[];
  total: number;
  page: number;
  limit: number;
}
