import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { USER_REPOSITORY } from '../../domain/user.repository';
import type { UserRepository } from '../../domain/user.repository';

export interface AuthenticatedRequest extends Request {
  user: { sub: string; email: string; role: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
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
      throw new UnauthorizedException('Missing access token.');
    }

    let payload: { sub: string; email: string; role: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    // Security Check: Re-validate against the current DB state on every request so a
    // banned/deleted account is cut off immediately, even if its access token has not
    // yet expired. Without this, banning a user would only take effect once the token expires.
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }
    if (user.isBanned) {
      throw new UnauthorizedException('This account has been suspended.');
    }

    request.user = payload;
    return true;
  }
}
