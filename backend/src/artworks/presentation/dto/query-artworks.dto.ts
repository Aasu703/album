import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class QueryArtworksDto {
  @IsString()
  @IsOptional()
  @MaxLength(140)
  search?: string;

  @IsString()
  @IsOptional()
  painterId?: string;

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
