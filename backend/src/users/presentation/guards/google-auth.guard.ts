import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Drives the passport-google-oauth20 strategy. On `GET /auth/google` it redirects the
 * browser to Google's consent screen; on the callback it validates the response and
 * populates `req.user` via GoogleStrategy.validate().
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
