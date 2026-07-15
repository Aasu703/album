import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class BidDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;
}
