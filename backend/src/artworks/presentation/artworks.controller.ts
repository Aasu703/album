import { Body, Controller, Post, UseGuards, Param } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Roles } from '../../users/presentation/decorators/roles.decorator';
import { CurrentUser } from '../../users/presentation/decorators/current-user.decorator';
import { JwtAuthGuard, AuthenticatedRequest } from '../../users/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../users/presentation/guards/roles.guard';
import { ArtworkSchemaClass } from '../infrastructure/artwork.schema';
import { CreateArtworkDto } from './dto/create-artwork.dto';

import { ArtworksService } from '../application/artworks.service';
import { BidDto } from './dto/bid.dto';

@Controller('artworks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArtworksController {
  constructor(
    @InjectModel(ArtworkSchemaClass.name)
    private readonly artworkModel: Model<ArtworkSchemaClass>,
    private readonly artworksService: ArtworksService,
  ) {}

  // Task 1: Bidding endpoint
  @Post(':id/bid')
  @Roles('USER')
  async placeBid(
    @Param('id') id: string,
    @Body() dto: BidDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    const updatedArtwork = await this.artworksService.placeBid(id, user.sub, dto.amount);
    return { success: true, data: { artwork: updatedArtwork } };
  }

  // Task 4: Artwork Creation Endpoint
  // Security Check: Only a VERIFIED_ARTIST can list an artwork. The RolesGuard enforces this
  // by parsing the cryptographically signed JWT.
  @Post()
  @Roles('VERIFIED_ARTIST')
  async createArtwork(
    @Body() dto: CreateArtworkDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    // Security Check: We do NOT accept painterId from the request body as that would
    // allow user impersonation. We strictly extract the subject (sub) from the verified JWT.
    const created = await this.artworkModel.create({
      ...dto,
      painterId: new Types.ObjectId(user.sub),
    });
    
    return { success: true, data: { artwork: created } };
  }
}
