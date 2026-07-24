import { IsString, IsStrongPassword, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  // Not subject to the strength policy: this is being verified against an existing
  // hash, which may predate the policy (or belong to an account created before it).
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
  @MaxLength(128)
  newPassword: string;
}
