import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { ArtworkSchemaClass } from '../infrastructure/artwork.schema';
import { CreateArtworkDto } from '../presentation/dto/create-artwork.dto';
import { QueryArtworksDto } from '../presentation/dto/query-artworks.dto';
import { UpdateArtworkDto } from '../presentation/dto/update-artwork.dto';

const PAINTER_FIELDS = 'firstName lastName';

@Injectable()
export class ArtworksService {
  constructor(
    @InjectModel(ArtworkSchemaClass.name)
    private readonly artworkModel: Model<ArtworkSchemaClass>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(dto: CreateArtworkDto, file: Express.Multer.File | undefined, painterId: string) {
    if (!file) {
      throw new BadRequestException('An image file is required.');
    }

    if (dto.listingType === 'AUCTION') {
      if (!dto.auctionEndTime) {
        throw new BadRequestException('Auction listings require an auctionEndTime.');
      }
      if (new Date(dto.auctionEndTime) <= new Date()) {
        throw new BadRequestException('auctionEndTime must be in the future.');
      }
      if (!dto.price || dto.price <= 0) {
        throw new BadRequestException('Auction listings require a positive starting price.');
      }
    }

    if (dto.listingType === 'FOR_SALE' && (!dto.price || dto.price <= 0)) {
      throw new BadRequestException('For-sale listings require a positive price.');
    }

    const uploadResult = await this.cloudinaryService.uploadImage(file);

    try {
      const created = await this.artworkModel.create({
        title: dto.title,
        description: dto.description,
        listingType: dto.listingType,
        price: dto.price,
        auctionEndTime: dto.listingType === 'AUCTION' ? new Date(dto.auctionEndTime!) : undefined,
        imageUrl: uploadResult.secure_url,
        imagePublicId: uploadResult.public_id,
        painterId: new Types.ObjectId(painterId),
      });
      return created;
    } catch (error) {
      // Best-effort cleanup so a failed DB write doesn't leave an orphaned Cloudinary asset.
      await this.cloudinaryService.destroyImage(uploadResult.public_id);
      throw error;
    }
  }

  async findAll(query: QueryArtworksDto) {
    const filter: Record<string, unknown> = {};
    if (query.listingType) {
      filter.listingType = query.listingType;
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {
        ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 24;

    const [items, total] = await Promise.all([
      this.artworkModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('painterId', PAINTER_FIELDS),
      this.artworkModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const artwork = await this.artworkModel
      .findById(id)
      .populate('painterId', PAINTER_FIELDS)
      .populate('bidderId', PAINTER_FIELDS);

    if (!artwork) {
      throw new NotFoundException('Artwork not found.');
    }
    return artwork;
  }

  async update(id: string, dto: UpdateArtworkDto, userId: string) {
    const artwork = await this.artworkModel.findById(id);
    if (!artwork) {
      throw new NotFoundException('Artwork not found.');
    }
    if (artwork.painterId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own listings.');
    }
    if (artwork.status === 'SOLD') {
      throw new BadRequestException('Sold listings cannot be edited.');
    }

    // Assign only explicitly-provided fields: TS class fields default to an
    // own `undefined` property even when omitted from the request body, so a
    // blind Object.assign(artwork, dto) would wipe out unset fields like title.
    if (dto.title !== undefined) artwork.title = dto.title;
    if (dto.description !== undefined) artwork.description = dto.description;
    if (dto.price !== undefined) artwork.price = dto.price;

    await artwork.save();
    return artwork;
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const artwork = await this.artworkModel.findById(id);
    if (!artwork) {
      throw new NotFoundException('Artwork not found.');
    }
    if (!isAdmin && artwork.painterId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own listings.');
    }

    await artwork.deleteOne();
    await this.cloudinaryService.destroyImage(artwork.imagePublicId);
  }

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
