import { IsEmail, IsOptional, IsString, IsStrongPassword, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(1)
  Firstname: string;

  @IsString()
  @MinLength(1)
  Lastname: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // Requires at least one lowercase letter, one uppercase letter, and one digit
  // (symbols are welcomed but not mandated) on top of the length floor, to keep
  // registered passwords out of the trivially-crackable/credential-stuffing range.
  @IsStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword: string;
}
