import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../users/presentation/decorators/roles.decorator';
import { CurrentUser } from '../../users/presentation/decorators/current-user.decorator';
import { JwtAuthGuard, AuthenticatedRequest } from '../../users/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../users/presentation/guards/roles.guard';
import { ArtworksService } from '../application/artworks.service';
import { BidDto } from './dto/bid.dto';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { QueryArtworksDto } from './dto/query-artworks.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('artworks')
export class ArtworksController {
  constructor(private readonly artworksService: ArtworksService) {}

  // Public: browse listings with optional filters.
  @Get()
  async findAll(@Query() query: QueryArtworksDto) {
    const result = await this.artworksService.findAll(query);
    return { success: true, data: result };
  }

  // Public: view a single listing.
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const artwork = await this.artworksService.findOne(id);
    return { success: true, data: { artwork } };
  }

  // Task 4: Artwork Creation Endpoint
  // Security Check: Only a VERIFIED_ARTIST can list an artwork. The RolesGuard enforces this
  // by parsing the cryptographically signed JWT.
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VERIFIED_ARTIST')
  @UseInterceptors(FileInterceptor('image'))
  async createArtwork(
    @Body() dto: CreateArtworkDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    if (file) {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException('Image must be JPEG, PNG, or WEBP.');
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new BadRequestException('Image must be 10MB or smaller.');
      }
    }

    // Security: We do NOT accept painterId from the request body as that would
    // allow user impersonation. We strictly extract the subject (sub) from the verified JWT.
    const created = await this.artworksService.create(dto, file, user.sub);
    return { success: true, data: { artwork: created } };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VERIFIED_ARTIST')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArtworkDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    const updated = await this.artworksService.update(id, dto, user.sub);
    return { success: true, data: { artwork: updated } };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VERIFIED_ARTIST', 'ADMIN')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedRequest['user']) {
    await this.artworksService.remove(id, user.sub, user.role === 'ADMIN');
    return { success: true };
  }

  // Task 1: Bidding endpoint
  @Post(':id/bid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  async placeBid(
    @Param('id') id: string,
    @Body() dto: BidDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    const updatedArtwork = await this.artworksService.placeBid(id, user.sub, dto.amount);
    return { success: true, data: { artwork: updatedArtwork } };
  }
}
