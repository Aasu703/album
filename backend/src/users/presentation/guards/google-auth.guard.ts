import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Drives the passport-google-oauth20 strategy. On `GET /auth/google` it redirects the
 * browser to Google's consent screen; on the callback it validates the response and
 * populates `req.user` via GoogleStrategy.validate().
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  /**
   * The callback is a top-level browser navigation, so a failure must never surface as a
   * JSON error body — the base guard's default is to throw, which strands the user on a
   * raw 401/500 page. Returning null instead lets the controller redirect back into the app.
   */
  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user;
  }
}
