import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArtworksController } from './presentation/artworks.controller';
import { ArtworkMongooseSchema, ArtworkSchemaClass } from './infrastructure/artwork.schema';

import { ArtworksService } from './application/artworks.service';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ArtworkSchemaClass.name, schema: ArtworkMongooseSchema }]),
    UsersModule,
  ],
  controllers: [ArtworksController],
  providers: [ArtworksService],
  exports: [ArtworksService],
})
export class ArtworksModule {}
