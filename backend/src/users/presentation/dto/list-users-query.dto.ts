import { IsEnum, IsOptional } from 'class-validator';
import type { UserRole } from '../../domain/user.entity';

export class ListUsersQueryDto {
  @IsEnum(['USER', 'VERIFIED_ARTIST', 'ADMIN'])
  @IsOptional()
  role?: UserRole;
}
