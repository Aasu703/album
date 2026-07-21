export type UserRole = 'USER' | 'VERIFIED_ARTIST' | 'ADMIN';
export type SellerStatus = 'none' | 'pending' | 'approved' | 'rejected';
/** How the account authenticates. 'local' = email + password; others are OAuth. */
export type AuthProvider = 'local' | 'google';

export interface User {
  id: string;
  email: string;
  /** Null for OAuth-only accounts, which never set a local password. */
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
  /** Identity provider that owns this account. Defaults to 'local'. */
  provider?: AuthProvider;
  /** Stable per-provider subject id (e.g. Google `sub`); null for local accounts. */
  providerId?: string | null;
  /** bcrypt hash of the current password-reset OTP; null when no reset is pending. */
  resetOtpHash?: string | null;
  /** When the pending reset OTP expires. */
  resetOtpExpires?: Date | null;
  /** Cloudinary URL of the profile picture; null falls back to the generated initials avatar. */
  avatarUrl?: string | null;
  /** Cloudinary public id, kept so the previous image can be destroyed on replace. */
  avatarPublicId?: string | null;
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
