export type UserRole = 'buyer' | 'seller' | 'admin';
export type SellerStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  sellerStatus: SellerStatus;
  stripeConnectAccountId?: string | null;
  stripeCustomerId?: string | null;
  createdAt: Date;
}

export type NewUser = Omit<
  User,
  'id' | 'createdAt' | 'role' | 'sellerStatus' | 'stripeConnectAccountId' | 'stripeCustomerId'
>;
