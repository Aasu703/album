import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { authenticator } from 'otplib';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthProvider, User, UserRole } from '../domain/user.entity';
import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';
import { LoginDto } from '../presentation/dto/login.dto';
import { RegisterDto } from '../presentation/dto/register.dto';
import { MailService } from '../../mail/mail.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import * as crypto from 'crypto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  sellerStatus: string;
  isBanned: boolean;
  isMfaEnabled: boolean;
  avatarUrl: string | null;
  createdAt: Date;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? null,
    role: user.role,
    sellerStatus: user.sellerStatus,
    isBanned: user.isBanned,
    isMfaEnabled: user.isMfaEnabled ?? false,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
  };
}

const MAX_FAILED_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const RESET_OTP_TTL_MINUTES = 10;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private signTokens(user: User): AuthTokens {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_TTL') ?? '15d',
    } as JwtSignOptions);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_TTL') ?? '30d',
    } as JwtSignOptions);

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto): Promise<PublicUser> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.userRepository.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.Firstname.trim(),
      lastName: dto.Lastname.trim(),
      phone: dto.phone?.trim() || null,
    });

    return toPublicUser(user);
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser } & AuthTokens> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      // Security: run a dummy bcrypt compare so login timing doesn't reveal whether
      // an email exists in the system (a basic user-enumeration mitigation).
      await bcrypt.compare(dto.password, '$2b$12$invalidsaltinvalidsaltinvalidsaltinva');
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.isBanned) {
      throw new ForbiddenException('This account has been suspended. Contact support for help.');
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new ForbiddenException('Account locked due to too many failed attempts. Try again later.');
    }

    if (!user.passwordHash) {
      // OAuth-only account (e.g. signed up with Google) has no local password to check.
      // Keep the message identical to a wrong password so we don't reveal how the
      // account authenticates (user-enumeration hardening).
      await bcrypt.compare(dto.password, '$2b$12$invalidsaltinvalidsaltinvalidsaltinva');
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockoutUntil = user.lockoutUntil;
      if (failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }
      await this.userRepository.update(user.id, { failedLoginAttempts: failedAttempts, lockoutUntil });
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.failedLoginAttempts !== 0 || user.lockoutUntil) {
      await this.userRepository.update(user.id, { failedLoginAttempts: 0, lockoutUntil: null });
    }

    if (user.isMfaEnabled) {
      if (!dto.mfaToken) {
        throw new UnauthorizedException('MFA token required.');
      }
      if (!user.mfaSecret) {
        throw new UnauthorizedException('MFA is enabled but no secret is found.');
      }
      const isValid = authenticator.verify({ token: dto.mfaToken, secret: user.mfaSecret });
      if (!isValid) {
        throw new UnauthorizedException('Invalid MFA token.');
      }
    }

    const tokens = this.signTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  /**
   * Logs a user in via a verified OAuth identity (e.g. Google). We trust the provider's
   * verified email as the account key: an existing account with the same email is reused
   * (and linked to the provider), otherwise a fresh passwordless account is created.
   * Returns the same shape as `login()` so the controller can set cookies identically.
   */
  async validateOAuthLogin(profile: {
    provider: AuthProvider;
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<{ user: PublicUser } & AuthTokens> {
    const email = profile.email.toLowerCase().trim();

    let user = await this.userRepository.findByEmail(email);

    if (user) {
      if (user.isBanned) {
        throw new ForbiddenException('This account has been suspended. Contact support for help.');
      }
      // Link the provider identity to the existing account the first time we see it.
      if (user.providerId !== profile.providerId) {
        const updated = await this.userRepository.update(user.id, {
          providerId: profile.providerId,
        });
        if (updated) user = updated;
      }
    } else {
      // First sign-in for this person — create a passwordless account owned by the provider.
      // `required` string fields can't be empty in Mongoose, so fall back to safe defaults.
      user = await this.userRepository.create({
        email,
        passwordHash: null,
        firstName: profile.firstName?.trim() || 'Member',
        lastName: profile.lastName?.trim() || 'User',
        phone: null,
        provider: profile.provider,
        providerId: profile.providerId,
      });
    }

    const tokens = this.signTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  async generateMfaSecret(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('User not found.');

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'PaintingGallery', secret);

    await this.userRepository.update(user.id, { mfaSecret: secret });

    return { secret, otpauthUrl };
  }

  async verifyAndEnableMfa(userId: string, token: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.mfaSecret) throw new BadRequestException('User or MFA secret not found.');

    const isValid = authenticator.verify({ token, secret: user.mfaSecret });
    if (isValid) {
      await this.userRepository.update(user.id, { isMfaEnabled: true });
      return true;
    }
    throw new BadRequestException('Invalid MFA token.');
  }

  async disableMfa(userId: string, token: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.mfaSecret) throw new BadRequestException('MFA is not enabled.');

    const isValid = authenticator.verify({ token, secret: user.mfaSecret });
    if (!isValid) {
      throw new BadRequestException('Invalid MFA token.');
    }
    await this.userRepository.update(user.id, { isMfaEnabled: false, mfaSecret: null });
    return true;
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
    if (user.isBanned) {
      throw new ForbiddenException('This account has been suspended.');
    }

    return this.signTokens(user);
  }

  /** Self-service: a buyer applies to become a seller (painter). */
  async applySeller(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (user.sellerStatus === 'pending' || user.sellerStatus === 'approved') {
      throw new BadRequestException(`Painter application is already ${user.sellerStatus}.`);
    }

    const updated = await this.userRepository.update(user.id, { sellerStatus: 'pending' });
    if (!updated) {
      throw new BadRequestException('Failed to submit painter application.');
    }
    return toPublicUser(updated);
  }

  async listPendingSellers(): Promise<PublicUser[]> {
    const users = await this.userRepository.findBySellerStatus('pending');
    return users.map(toPublicUser);
  }

  /** Admin approves a pending painter application, upgrading their role. */
  async approveSeller(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const updated = await this.userRepository.update(user.id, {
      role: 'VERIFIED_ARTIST',
      sellerStatus: 'approved',
    });
    if (!updated) {
      throw new BadRequestException('Failed to approve painter.');
    }
    return toPublicUser(updated);
  }

  async rejectSeller(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const updated = await this.userRepository.update(user.id, { sellerStatus: 'rejected' });
    if (!updated) {
      throw new BadRequestException('Failed to reject painter application.');
    }
    return toPublicUser(updated);
  } 

  async me(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    return toPublicUser(user);
  }

  /** Self-service: an authenticated user updates their own profile details. */
  async updateProfile(
    userId: string,
    dto: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    // Patch only the fields that were actually provided, trimming free-text input.
    const patch: Partial<User> = {};
    if (dto.firstName !== undefined) patch.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) patch.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) patch.phone = dto.phone.trim() || null;

    const updated = await this.userRepository.update(user.id, patch);
    if (!updated) {
      throw new BadRequestException('Failed to update profile.');
    }
    return toPublicUser(updated);
  }

  /** Replaces the user's profile picture, discarding the previously stored image. */
  async updateAvatar(userId: string, file: Express.Multer.File): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const upload = await this.cloudinaryService.uploadImage(file, 'painting-marketplace/avatars');

    const updated = await this.userRepository.update(user.id, {
      avatarUrl: upload.secure_url,
      avatarPublicId: upload.public_id,
    });
    if (!updated) {
      // The DB write failed, so the freshly uploaded asset would otherwise be orphaned.
      await this.cloudinaryService.destroyImage(upload.public_id);
      throw new BadRequestException('Failed to update profile picture.');
    }

    if (user.avatarPublicId) {
      await this.cloudinaryService.destroyImage(user.avatarPublicId);
    }

    return toPublicUser(updated);
  }

  /** Clears the profile picture, falling back to the generated initials avatar. */
  async removeAvatar(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const updated = await this.userRepository.update(user.id, {
      avatarUrl: null,
      avatarPublicId: null,
    });
    if (!updated) {
      throw new BadRequestException('Failed to remove profile picture.');
    }

    if (user.avatarPublicId) {
      await this.cloudinaryService.destroyImage(user.avatarPublicId);
    }

    return toPublicUser(updated);
  }

  // ---- Password reset (email OTP) ----

  /**
   * Starts a password reset. Always resolves without revealing whether the email exists
   * (anti-enumeration). For a valid local account we generate a 6-digit OTP, store only its
   * bcrypt hash with a short expiry, and email the raw code. OAuth-only accounts (no local
   * password) are silently skipped — there is nothing to reset.
   */
  async forgotPassword(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    const user = await this.userRepository.findByEmail(normalized);

    if (!user || user.isBanned || !user.passwordHash) {
      return;
    }

    // 6-digit code, generated with a CSPRNG (0–999999, zero-padded).
    const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const resetOtpHash = await bcrypt.hash(otp, 10);
    const resetOtpExpires = new Date(Date.now() + RESET_OTP_TTL_MINUTES * 60 * 1000);

    await this.userRepository.update(user.id, { resetOtpHash, resetOtpExpires });
    await this.mailService.sendPasswordResetOtp(user.email, otp, RESET_OTP_TTL_MINUTES);
  }

  /** Completes a reset: verifies the OTP, sets the new password, and clears the OTP. */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    const user = await this.userRepository.findByEmail(normalized);

    // Uniform failure message so an attacker can't distinguish "no such email" from "bad code".
    const genericError = new BadRequestException('Invalid or expired reset code.');

    if (!user || !user.resetOtpHash || !user.resetOtpExpires) {
      throw genericError;
    }
    if (user.resetOtpExpires.getTime() < Date.now()) {
      throw genericError;
    }
    const otpMatches = await bcrypt.compare(otp, user.resetOtpHash);
    if (!otpMatches) {
      throw genericError;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(user.id, {
      passwordHash,
      resetOtpHash: null,
      resetOtpExpires: null,
      // A successful reset also clears any brute-force lockout.
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });
  }

  /** Authenticated self-service password change: verify the current password, set a new one. */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    if (!user.passwordHash) {
      // OAuth-only account has no local password to change.
      throw new BadRequestException(
        'This account signs in with Google and has no password to change.',
      );
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new BadRequestException('Your current password is incorrect.');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from the current one.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(user.id, { passwordHash });
  }

  // ---- Admin: user & painter management ----

  async listUsers(role?: UserRole): Promise<PublicUser[]> {
    const users = await this.userRepository.findAll(role ? { role } : undefined);
    return users.map(toPublicUser);
  }

  async banUser(adminId: string, userId: string, reason?: string): Promise<PublicUser> {
    if (adminId === userId) {
      throw new BadRequestException('Admins cannot ban their own account.');
    }
    const target = await this.userRepository.findById(userId);
    if (!target) {
      throw new UnauthorizedException('User not found.');
    }
    if (target.role === 'ADMIN') {
      throw new ForbiddenException('Admin accounts cannot be banned.');
    }
    const updated = await this.userRepository.update(userId, {
      isBanned: true,
      bannedReason: reason?.trim() || 'Violation of community guidelines.',
    });
    if (!updated) {
      throw new BadRequestException('Failed to ban user.');
    }
    return toPublicUser(updated);
  }

  async unbanUser(userId: string): Promise<PublicUser> {
    const target = await this.userRepository.findById(userId);
    if (!target) {
      throw new UnauthorizedException('User not found.');
    }
    const updated = await this.userRepository.update(userId, {
      isBanned: false,
      bannedReason: null,
    });
    if (!updated) {
      throw new BadRequestException('Failed to unban user.');
    }
    return toPublicUser(updated);
  }
}
