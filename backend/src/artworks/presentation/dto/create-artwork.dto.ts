import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateArtworkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string;
}
