import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArtworksController } from './presentation/artworks.controller';
import { ArtworkMongooseSchema, ArtworkSchemaClass } from './infrastructure/artwork.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ArtworkSchemaClass.name, schema: ArtworkMongooseSchema }]),
  ],
  controllers: [ArtworksController],
  providers: [],
})
export class ArtworksModule {}
