import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ArtworkVisibility } from '../../domain/artwork.entity';

export class CreateArtworkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string;

  // Defaults to 'public' in the service when omitted.
  @IsIn(['public', 'private'])
  @IsOptional()
  visibility?: ArtworkVisibility;
}
