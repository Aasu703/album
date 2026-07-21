import { Body, Controller, Get, HttpCode, Post, UnauthorizedException, UseGuards, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import * as QRCode from 'qrcode';
import { AuthService } from '../application/auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MfaTokenDto } from './dto/mfa.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthenticatedRequest } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleOAuthUser } from './strategies/google.strategy';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';

// 'lax' rather than 'strict' because the Google OAuth callback lands the browser on a
// protected page via a redirect chain that starts off-site: browsers withhold Strict
// cookies from that navigation, so the edge guard in proxy.ts would see no session and
// bounce a just-authenticated user back to /login. Lax still withholds cookies from
// cross-site subrequests and non-GET navigations, which is where CSRF risk actually lives.
const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE ?? 'lax') as CookieOptions['sameSite'];

function cookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    // Secure cookies are dropped by browsers over plain HTTP, which breaks local dev.
    secure: IS_PRODUCTION,
    sameSite: COOKIE_SAMESITE,
    maxAge,
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  // 15-day access token / 30-day refresh token per module requirements.
  res.cookie('accessToken', accessToken, cookieOptions(15 * 24 * 60 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, cookieOptions(30 * 24 * 60 * 60 * 1000));
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Stricter dedicated rate limit: cap account creation to 5 attempts/minute per IP
  // to slow mass/automated sign-ups, on top of the global 100/min default.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(201)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { success: true, data: { user } };
  }

  // Stricter dedicated rate limit on login: 10 attempts/minute per IP. This is a
  // network-layer brute-force control that complements (does not replace) the
  // per-account 10-attempt / 15-minute lockout enforced in AuthService.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    // Set HTTP-only cookies so the browser never touches raw JWTs.
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return { success: true, data: { user: result.user } };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token.');
    }

    const tokens = await this.authService.refresh(refreshToken);

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return { success: true };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedRequest['user']) {
    const profile = await this.authService.me(user.sub);
    return { success: true, data: { user: profile } };
  }

  // ---- Password reset (email OTP) ----

  /** Step 1: request a reset code. Always returns success (never reveals if the email exists). */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      success: true,
      message: 'If an account exists for that email, a reset code has been sent.',
    };
  }

  /** Step 2: submit the emailed code plus a new password. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
    return { success: true, message: 'Your password has been reset. You can now sign in.' };
  }

  /** Authenticated: change your own password (requires the current one). */
  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
    return { success: true, message: 'Your password has been updated.' };
  }

  // ---- Google OAuth ----

  /**
   * Step 1: kick off the Google OAuth flow. The guard immediately redirects the browser
   * to Google's consent screen, so this handler body never actually runs.
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Intentionally empty — GoogleAuthGuard performs the redirect to Google.
  }

  /**
   * Step 2: Google redirects back here. The guard validates the response and populates
   * req.user; we exchange it for our own session cookies and bounce to the frontend.
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    // Null when the handshake itself failed (denied consent, expired/replayed code, or a
    // provider error) — GoogleAuthGuard hands us null rather than throwing so we can redirect.
    const oauthUser = req.user as GoogleOAuthUser | null;
    if (!oauthUser) {
      return res.redirect(`${FRONTEND_ORIGIN}/login?error=oauth`);
    }

    try {
      const result = await this.authService.validateOAuthLogin(oauthUser);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      return res.redirect(`${FRONTEND_ORIGIN}/dashboard`);
    } catch {
      // Banned account or any linking failure — send the user back to login with a flag
      // rather than leaking the reason in the URL.
      return res.redirect(`${FRONTEND_ORIGIN}/login?error=oauth`);
    }
  }

  // ---- TOTP-based MFA (baseline requirement) ----

  /** Step 1: generate a fresh TOTP secret + QR code for the authenticated user to scan. */
  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  async setupMfa(@CurrentUser() user: AuthenticatedRequest['user']) {
    const { secret, otpauthUrl } = await this.authService.generateMfaSecret(user.sub);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { success: true, data: { secret, otpauthUrl, qrCodeDataUrl } };
  }

  /** Step 2: confirm the user actually has the secret loaded in their authenticator app. */
  @Post('mfa/verify')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async verifyMfa(@CurrentUser() user: AuthenticatedRequest['user'], @Body() dto: MfaTokenDto) {
    await this.authService.verifyAndEnableMfa(user.sub, dto.token);
    return { success: true };
  }

  /** Disables MFA — requires a fresh valid code, not just a click, to prevent session-hijack downgrade. */
  @Post('mfa/disable')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async disableMfa(@CurrentUser() user: AuthenticatedRequest['user'], @Body() dto: MfaTokenDto) {
    await this.authService.disableMfa(user.sub, dto.token);
    return { success: true };
  }
}
