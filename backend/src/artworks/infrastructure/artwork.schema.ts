import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { ListingType } from '../domain/artwork.entity';
import { UserSchemaClass } from '../../users/infrastructure/user.schema';

export type ArtworkDocument = HydratedDocument<ArtworkSchemaClass>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'artworks' })
export class ArtworkSchemaClass {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  imagePublicId: string;

  @Prop({ type: Types.ObjectId, ref: UserSchemaClass.name, required: true })
  painterId: Types.ObjectId;

  @Prop({ enum: ['SOCIAL_ONLY', 'FOR_SALE', 'AUCTION'], required: true })
  listingType: ListingType;

  @Prop({ type: Number })
  price?: number;

  @Prop({ type: Number })
  currentHighestBid?: number;

  @Prop({ type: Types.ObjectId, ref: UserSchemaClass.name })
  bidderId?: Types.ObjectId;

  @Prop({ type: Date })
  auctionEndTime?: Date;

  @Prop({ enum: ['AVAILABLE', 'SOLD'], default: 'AVAILABLE' })
  status: string;

  createdAt?: Date;
}

export const ArtworkMongooseSchema = SchemaFactory.createForClass(ArtworkSchemaClass);

ArtworkMongooseSchema.set('toJSON', {
  virtuals: true,
  transform: ((_doc: unknown, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    // painterId/bidderId are plain ObjectIds when not populated, or already-transformed
    // plain objects (via the User schema's own toJSON) when populated with .populate().
    if (ret.painterId && typeof ret.painterId !== 'object') {
      ret.painterId = String(ret.painterId);
    }
    if (ret.bidderId && typeof ret.bidderId !== 'object') {
      ret.bidderId = String(ret.bidderId);
    }
    delete ret._id;
    delete ret.__v;
    delete ret.imagePublicId;
    return ret;
  }) as (...args: unknown[]) => unknown,
});
