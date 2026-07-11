export type UserRole = "buyer" | "seller" | "admin";
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
