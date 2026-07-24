import { IsEmail, IsString, IsStrongPassword, Length, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  // 6-digit numeric one-time code emailed to the user.
  @IsString()
  @Length(6, 6)
  otp: string;

  @IsStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
  @MaxLength(128)
  newPassword: string;
}
