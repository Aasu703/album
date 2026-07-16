import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateArtworkDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(140)
  title?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(4000)
  description?: string;
}
