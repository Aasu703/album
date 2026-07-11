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
import { User } from '../domain/user.entity';
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
  };
}

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
      expiresIn: this.configService.get<string>('JWT_ACCESS_TTL') ?? '15m',
    } as JwtSignOptions);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_TTL') ?? '7d',
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

    const passwordHash = await bcrypt.hash(dto.password, 10);

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
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new ForbiddenException('Account locked due to too many failed attempts. Try again later.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockoutUntil = user.lockoutUntil;
      if (failedAttempts >= 10) {
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
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
    const otpauthUrl = authenticator.keyuri(user.email, 'FreeAlbumApp', secret);

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

    return this.signTokens(user);
  }

  async verifyArtist(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    
    // Upgrade role to VERIFIED_ARTIST
    const updated = await this.userRepository.update(user.id, { role: 'VERIFIED_ARTIST' });
    if (!updated) {
      throw new BadRequestException('Failed to verify artist.');
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
}
