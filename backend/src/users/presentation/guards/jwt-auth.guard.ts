import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: { sub: string; email: string; role: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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

    try {
      request.user = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}
