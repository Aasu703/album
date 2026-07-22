import { Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      this.logger.warn(`Google OAuth handshake failed: ${err instanceof Error ? err.message : String(err ?? 'no user returned')}`);
      return null as TUser;
    }
    return user;
  }
}
