import { Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../application/auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthenticatedRequest } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

function frontendOrigin(req: Request): string {
  return process.env.FRONTEND_ORIGIN ?? `${req.protocol}://${req.get('host')}`;
}

@Controller('users')
// Apply guards globally to the controller for defense-in-depth
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  // Self-service: any authenticated buyer can apply to become a seller.
  @Post('apply-seller')
  async applySeller(@CurrentUser() user: AuthenticatedRequest['user']) {
    const updated = await this.authService.applySeller(user.sub);
    return { success: true, data: { user: updated } };
  }

  // Self-service: a seller can request a fresh onboarding link if theirs expired.
  @Get('onboarding-link')
  async onboardingLink(@CurrentUser() user: AuthenticatedRequest['user'], @Req() req: Request) {
    const onboardingUrl = await this.authService.createOnboardingLink(user.sub, frontendOrigin(req));
    return { success: true, data: { onboardingUrl } };
  }

  // Admin: list sellers awaiting approval.
  @Get('pending-sellers')
  @Roles('ADMIN')
  async pendingSellers() {
    const users = await this.authService.listPendingSellers();
    return { success: true, data: { users } };
  }

  // Security Check: Only an ADMIN can approve or reject sellers. The RolesGuard strictly
  // enforces this by verifying the 'role' field in the cryptographically signed JWT.
  @Patch(':id/approve-seller')
  @Roles('ADMIN')
  async approveSeller(@Param('id') id: string, @Req() req: Request) {
    const result = await this.authService.approveSeller(id, frontendOrigin(req));
    return { success: true, data: result };
  }

  @Patch(':id/reject-seller')
  @Roles('ADMIN')
  async rejectSeller(@Param('id') id: string) {
    const updatedUser = await this.authService.rejectSeller(id);
    return { success: true, data: { user: updatedUser } };
  }
}
