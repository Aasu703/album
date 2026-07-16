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

    const uploadResult = await this.cloudinaryService.uploadImage(file);

    try {
      const created = await this.artworkModel.create({
        title: dto.title,
        description: dto.description,
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
    if (query.painterId) {
      filter.painterId = query.painterId;
    }
    if (query.search) {
      filter.$text = { $search: query.search };
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
    const artwork = await this.artworkModel.findById(id).populate('painterId', PAINTER_FIELDS);

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

    // Assign only explicitly-provided fields: TS class fields default to an
    // own `undefined` property even when omitted from the request body, so a
    // blind Object.assign(artwork, dto) would wipe out unset fields like title.
    if (dto.title !== undefined) artwork.title = dto.title;
    if (dto.description !== undefined) artwork.description = dto.description;

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
}
