import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const ALLOWED_EMOJIS = ['❤️', '🔥', '👏', '😍', '🎨'] as const;
export type ReactionEmoji = (typeof ALLOWED_EMOJIS)[number];

export type ReactionDocument = HydratedDocument<ReactionSchemaClass>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'reactions' })
export class ReactionSchemaClass {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  artworkId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ enum: ALLOWED_EMOJIS, required: true })
  emoji: ReactionEmoji;

  createdAt?: Date;
}

export const ReactionMongooseSchema = SchemaFactory.createForClass(ReactionSchemaClass);

// One active reaction per user per artwork — re-reacting overwrites the previous emoji.
ReactionMongooseSchema.index({ artworkId: 1, userId: 1 }, { unique: true });
