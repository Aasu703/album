import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { USER_REPOSITORY } from '../../domain/user.repository';
import type { UserRepository } from '../../domain/user.repository';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Like JwtAuthGuard but never blocks the request: if a valid, non-banned session is present
 * it populates `request.user`; otherwise it lets the request through as anonymous. Used on
 * otherwise-public routes that behave differently for the resource owner (e.g. private artworks).
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    let token = '';
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length);
    } else if (request.cookies && request.cookies['accessToken']) {
      token = request.cookies['accessToken'];
    }

    if (!token) {
      return true;
    }

    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
        tokenVersion?: number;
      }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      const user = await this.userRepository.findById(payload.sub);
      // A revoked token (logout/password-change bumped tokenVersion since this token was
      // issued) is treated the same as an invalid one: anonymous, not authenticated.
      if (user && !user.isBanned && (payload.tokenVersion ?? 0) === (user.tokenVersion ?? 0)) {
        request.user = payload;
      }
    } catch {
      // Invalid/expired token → treat as anonymous rather than failing the request.
    }

    return true;
  }
}
