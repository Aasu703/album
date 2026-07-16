import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthenticatedRequest } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { BanUserDto } from './dto/ban-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

@Controller('users')
// Apply guards globally to the controller for defense-in-depth
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  // Self-service: any authenticated buyer can apply to become a painter.
  @Post('apply-seller')
  async applySeller(@CurrentUser() user: AuthenticatedRequest['user']) {
    const updated = await this.authService.applySeller(user.sub);
    return { success: true, data: { user: updated } };
  }

  // Admin: list painter applications awaiting approval.
  @Get('pending-sellers')
  @Roles('ADMIN')
  async pendingSellers() {
    const users = await this.authService.listPendingSellers();
    return { success: true, data: { users } };
  }

  // Security Check: Only an ADMIN can approve or reject painters. The RolesGuard strictly
  // enforces this by verifying the 'role' field in the cryptographically signed JWT.
  @Patch(':id/approve-seller')
  @Roles('ADMIN')
  async approveSeller(@Param('id') id: string) {
    const user = await this.authService.approveSeller(id);
    return { success: true, data: { user } };
  }

  @Patch(':id/reject-seller')
  @Roles('ADMIN')
  async rejectSeller(@Param('id') id: string) {
    const updatedUser = await this.authService.rejectSeller(id);
    return { success: true, data: { user: updatedUser } };
  }

  // ---- Admin: user & painter management ----

  @Get()
  @Roles('ADMIN')
  async listUsers(@Query() query: ListUsersQueryDto) {
    const users = await this.authService.listUsers(query.role);
    return { success: true, data: { users } };
  }

  @Patch(':id/ban')
  @Roles('ADMIN')
  async banUser(
    @Param('id') id: string,
    @Body() dto: BanUserDto,
    @CurrentUser() admin: AuthenticatedRequest['user'],
  ) {
    const user = await this.authService.banUser(admin.sub, id, dto.reason);
    return { success: true, data: { user } };
  }

  @Patch(':id/unban')
  @Roles('ADMIN')
  async unbanUser(@Param('id') id: string) {
    const user = await this.authService.unbanUser(id);
    return { success: true, data: { user } };
  }
}
