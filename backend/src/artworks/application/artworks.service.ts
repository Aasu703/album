import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ArtworkSchemaClass } from '../infrastructure/artwork.schema';

@Injectable()
export class ArtworksService {
  constructor(
    @InjectModel(ArtworkSchemaClass.name)
    private readonly artworkModel: Model<ArtworkSchemaClass>,
  ) {}

  async placeBid(artworkId: string, userId: string, amount: number) {
    const artwork = await this.artworkModel.findById(artworkId);
    if (!artwork) {
      throw new NotFoundException('Artwork not found.');
    }

    // Security Check: Only AUCTION items can accept bids
    if (artwork.listingType !== 'AUCTION') {
      throw new BadRequestException('This artwork is not up for auction.');
    }

    // Security Check: Prevent artists from bidding on their own work (shill bidding fraud)
    if (artwork.painterId.toString() === userId) {
      throw new BadRequestException('You cannot bid on your own artwork.');
    }

    // Security Check: Ensure auction is still active
    if (artwork.status !== 'AVAILABLE' || (artwork.auctionEndTime && new Date() > artwork.auctionEndTime)) {
      throw new BadRequestException('This auction has ended.');
    }

    const currentHighest = artwork.currentHighestBid ?? artwork.price ?? 0;

    // Security Check: Ensure the new bid is higher than the current highest bid
    if (amount <= currentHighest) {
      throw new BadRequestException(`Bid must be greater than the current highest bid of ${currentHighest}.`);
    }

    // Update the artwork with the new highest bid
    artwork.currentHighestBid = amount;
    artwork.bidderId = new Types.ObjectId(userId);
    await artwork.save();

    return artwork;
  }
}
