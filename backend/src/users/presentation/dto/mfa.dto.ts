import { IsString, Length } from 'class-validator';

export class MfaTokenDto {
  @IsString()
  @Length(6, 6, { message: 'Authenticator code must be 6 digits.' })
  token: string;
}
