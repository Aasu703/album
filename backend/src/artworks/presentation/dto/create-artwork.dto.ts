import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import type { ListingType } from '../../domain/artwork.entity';

export class CreateArtworkDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  // Security: Ensure imageUrl is a valid URL to prevent malicious string inputs
  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;

  // Security: Ensure strictly typed enum to prevent NoSQL injection or invalid values
  @IsEnum(['SOCIAL_ONLY', 'FOR_SALE', 'AUCTION'])
  @IsNotEmpty()
  listingType: ListingType;

  // Security: Price must be a positive number if provided
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;
}
