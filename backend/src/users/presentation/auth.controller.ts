import { Body, Controller, Get, HttpCode, Post, UnauthorizedException, UseGuards, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from '../application/auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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
  res.cookie('accessToken', accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { success: true, data: { user } };
  }

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
}
