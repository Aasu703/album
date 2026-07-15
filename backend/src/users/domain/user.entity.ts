export type UserRole = 'USER' | 'VERIFIED_ARTIST' | 'ADMIN';
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
  stripeChargesEnabled?: boolean;
  createdAt: Date;
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
  isMfaEnabled?: boolean;
  mfaSecret?: string | null;
}

export type NewUser = Omit<
  User,
  | 'id'
  | 'createdAt'
  | 'role'
  | 'sellerStatus'
  | 'stripeConnectAccountId'
  | 'stripeCustomerId'
  | 'stripeChargesEnabled'
  | 'failedLoginAttempts'
  | 'lockoutUntil'
  | 'isMfaEnabled'
  | 'mfaSecret'
>;
