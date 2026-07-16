import { Body, Controller, Get, HttpCode, Post, UnauthorizedException, UseGuards, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import * as QRCode from 'qrcode';
import { AuthService } from '../application/auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MfaTokenDto } from './dto/mfa.dto';
import { AuthenticatedRequest } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function cookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    // Secure cookies are dropped by browsers over plain HTTP, which breaks local dev.
    secure: IS_PRODUCTION,
    sameSite: 'strict',
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
