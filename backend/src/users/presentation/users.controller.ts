import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { assertIsAllowedImageContent } from '../../common/assert-image-content';
import { AuthService } from '../application/auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthenticatedRequest } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { BanUserDto } from './dto/ban-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

  // Self-service: any authenticated user can update their own profile details.
  @Patch('me')
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    const updated = await this.authService.updateProfile(user.sub, dto);
    return { success: true, data: { user: updated } };
  }

  // Self-service: upload or replace the current user's profile picture.
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    if (!file) {
      throw new BadRequestException('No image was provided.');
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Profile picture must be JPEG, PNG, or WEBP.');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Profile picture must be 5MB or smaller.');
    }
    // Security: the check above only trusts the client-supplied Content-Type header.
    // Sniff the actual bytes so a mislabeled/malicious upload can't slip through.
    await assertIsAllowedImageContent(file.buffer, ALLOWED_AVATAR_MIME_TYPES);

    const updated = await this.authService.updateAvatar(user.sub, file);
    return { success: true, data: { user: updated } };
  }

  // Self-service: drop the profile picture and fall back to the initials avatar.
  @Delete('me/avatar')
  async removeAvatar(@CurrentUser() user: AuthenticatedRequest['user']) {
    const updated = await this.authService.removeAvatar(user.sub);
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
