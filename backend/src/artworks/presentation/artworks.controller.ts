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
import { assertIsAllowedImageContent } from '../../common/assert-image-content';
import { CurrentUser } from '../../users/presentation/decorators/current-user.decorator';
import { JwtAuthGuard, AuthenticatedRequest } from '../../users/presentation/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../users/presentation/guards/optional-jwt-auth.guard';
import { ArtworksService } from '../application/artworks.service';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { QueryArtworksDto } from './dto/query-artworks.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('artworks')
export class ArtworksController {
  constructor(private readonly artworksService: ArtworksService) {}

  // Public: browse the gallery with optional search/filter. Only public artworks are returned.
  @Get()
  async findAll(@Query() query: QueryArtworksDto) {
    const result = await this.artworksService.findAll(query);
    return { success: true, data: result };
  }

  // Authenticated: the current user's own uploads, including their private ones.
  // Declared before ':id' so "mine" isn't captured as an artwork id.
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async findMine(@CurrentUser() user: AuthenticatedRequest['user']) {
    const result = await this.artworksService.findMine(user.sub);
    return { success: true, data: result };
  }

  // Public: view a single painting. Optional auth so an owner can view their own private
  // artwork; for everyone else a private artwork returns 404.
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedRequest['user'] | undefined,
  ) {
    const artwork = await this.artworksService.findOne(id, user?.sub);
    return { success: true, data: { artwork } };
  }

  // Any authenticated user can post a photo/painting (public or private).
  @Post()
  @UseGuards(JwtAuthGuard)
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
      // Security: the check above only trusts the client-supplied Content-Type header.
      // Sniff the actual bytes so a mislabeled/malicious upload can't slip through.
      await assertIsAllowedImageContent(file.buffer, ALLOWED_IMAGE_MIME_TYPES);
    }

    // Security: We do NOT accept painterId from the request body as that would
    // allow user impersonation. We strictly extract the subject (sub) from the verified JWT.
    const created = await this.artworksService.create(dto, file, user.sub);
    return { success: true, data: { artwork: created } };
  }

  // Owner-only edit (ownership enforced in the service). Any authenticated uploader qualifies.
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArtworkDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    const updated = await this.artworksService.update(id, dto, user.sub);
    return { success: true, data: { artwork: updated } };
  }

  // Owner or admin can delete (enforced in the service via the isAdmin flag).
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedRequest['user']) {
    await this.artworksService.remove(id, user.sub, user.role === 'ADMIN');
    return { success: true };
  }
}
