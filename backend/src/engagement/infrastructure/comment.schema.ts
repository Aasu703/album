import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserSchemaClass } from '../../users/infrastructure/user.schema';

export type CommentDocument = HydratedDocument<CommentSchemaClass>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'comments' })
export class CommentSchemaClass {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  artworkId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: UserSchemaClass.name, required: true })
  authorId: Types.ObjectId;

  // Stored as plain text only. The frontend must render this as text content
  // (never via dangerouslySetInnerHTML) so no stored-XSS payload can execute.
  @Prop({ required: true, trim: true, maxlength: 1000 })
  text: string;

  createdAt?: Date;
}

export const CommentMongooseSchema = SchemaFactory.createForClass(CommentSchemaClass);
CommentMongooseSchema.index({ artworkId: 1, createdAt: -1 });

CommentMongooseSchema.set('toJSON', {
  virtuals: true,
  transform: ((_doc: unknown, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    ret.artworkId = String(ret.artworkId);
    if (ret.authorId && typeof ret.authorId !== 'object') {
      ret.authorId = String(ret.authorId);
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  }) as (...args: unknown[]) => unknown,
});
