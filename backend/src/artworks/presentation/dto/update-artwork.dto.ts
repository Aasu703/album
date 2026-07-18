import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ArtworkVisibility } from '../../domain/artwork.entity';

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

  @IsIn(['public', 'private'])
  @IsOptional()
  visibility?: ArtworkVisibility;
}
