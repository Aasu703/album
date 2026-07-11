import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { ListingType } from '../../domain/artwork.entity';

export class CreateArtworkDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  // Security: Ensure strictly typed enum to prevent NoSQL injection or invalid values
  @IsEnum(['SOCIAL_ONLY', 'FOR_SALE', 'AUCTION'])
  @IsNotEmpty()
  listingType: ListingType;

  // Price is the sale price for FOR_SALE listings, or the starting bid for AUCTION listings.
  // Multipart form fields arrive as strings, so we explicitly coerce to a number.
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  // Required for AUCTION listings only (validated in the service, since it depends on listingType).
  @IsISO8601()
  @IsOptional()
  auctionEndTime?: string;
}
