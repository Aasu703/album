import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('users')
// Apply guards globally to the controller for defense-in-depth
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  // Task 3: Admin Vetting Endpoint
  // Security Check: Only an ADMIN can access this route. The RolesGuard strictly 
  // enforces this by verifying the 'role' field in the cryptographically signed JWT.
  @Patch(':id/verify')
  @Roles('ADMIN')
  async verifyArtist(@Param('id') id: string) {
    const updatedUser = await this.authService.verifyArtist(id);
    return { success: true, data: { user: updatedUser } };
  }
}
