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
import { User, UserRole } from '../domain/user.entity';
import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';
import { LoginDto } from '../presentation/dto/login.dto';
import { RegisterDto } from '../presentation/dto/register.dto';

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
    createdAt: user.createdAt,
  };
}

const MAX_FAILED_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
