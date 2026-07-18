import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserSchemaClass } from '../../users/infrastructure/user.schema';
import type { ArtworkVisibility } from '../domain/artwork.entity';

export type ArtworkDocument = HydratedDocument<ArtworkSchemaClass>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'artworks' })
export class ArtworkSchemaClass {
  @Prop({ required: true, trim: true, maxlength: 140 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 4000 })
  description: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  imagePublicId: string;

  @Prop({ type: Types.ObjectId, ref: UserSchemaClass.name, required: true, index: true })
  painterId: Types.ObjectId;

  // 'public' shows in the gallery to everyone; 'private' is visible only to the owner.
  @Prop({ enum: ['public', 'private'], default: 'public', index: true })
  visibility: ArtworkVisibility;

  createdAt?: Date;
}

export const ArtworkMongooseSchema = SchemaFactory.createForClass(ArtworkSchemaClass);

ArtworkMongooseSchema.index({ createdAt: -1 });
ArtworkMongooseSchema.index({ title: 'text', description: 'text' });

ArtworkMongooseSchema.set('toJSON', {
  virtuals: true,
  transform: ((_doc: unknown, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    if (ret.painterId && typeof ret.painterId !== 'object') {
      ret.painterId = String(ret.painterId);
    }
    delete ret._id;
    delete ret.__v;
    delete ret.imagePublicId;
    return ret;
  }) as (...args: unknown[]) => unknown,
});
