import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthProvider } from '../../domain/user.entity';

/** Shape handed to `req.user` after a successful Google handshake. */
export interface GoogleOAuthUser {
  provider: AuthProvider;
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  /**
   * Runs after Google redirects back. We only extract the profile here and hand it to the
   * controller/service — all DB linking/creation stays in AuthService (clean architecture).
   */
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new UnauthorizedException('Google account did not provide an email address.'), false);
      return;
    }

    const oauthUser: GoogleOAuthUser = {
      provider: 'google',
      providerId: profile.id,
      email,
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
    };
    done(null, oauthUser);
  }
}
