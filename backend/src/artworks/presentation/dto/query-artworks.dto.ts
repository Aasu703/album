import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import type { ListingType } from '../../domain/artwork.entity';

export class QueryArtworksDto {
  @IsEnum(['SOCIAL_ONLY', 'FOR_SALE', 'AUCTION'])
  @IsOptional()
  listingType?: ListingType;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  minPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxPrice?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  limit?: number = 24;
}
