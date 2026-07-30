export type UserRole = 'USER' | 'VERIFIED_ARTIST' | 'ADMIN';
export type SellerStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type AuthProvider = 'local' | 'google';

export interface User {
  id: string;
  email: string;
  passwordHash?: string | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  sellerStatus: SellerStatus;
  isBanned: boolean;
  bannedReason?: string | null;
  createdAt: Date;
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
  isMfaEnabled?: boolean;
  mfaSecret?: string | null;
  provider?: AuthProvider;
  providerId?: string | null;
  resetOtpHash?: string | null;
  resetOtpExpires?: Date | null;
  resetOtpAttempts?: number;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
  tokenVersion?: number;
}

export type NewUser = Omit<
  User,
  | 'id'
  | 'createdAt'
  | 'role'
  | 'sellerStatus'
  | 'isBanned'
  | 'bannedReason'
  | 'failedLoginAttempts'
  | 'lockoutUntil'
  | 'isMfaEnabled'
  | 'mfaSecret'
>;
