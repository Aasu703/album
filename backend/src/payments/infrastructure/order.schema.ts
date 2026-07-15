import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ArtworkSchemaClass } from '../../artworks/infrastructure/artwork.schema';
import { UserSchemaClass } from '../../users/infrastructure/user.schema';

export type OrderStatus = 'pending' | 'paid' | 'failed';
export type OrderDocument = HydratedDocument<OrderSchemaClass>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'orders' })
export class OrderSchemaClass {
  @Prop({ type: Types.ObjectId, ref: ArtworkSchemaClass.name, required: true })
  artworkId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: UserSchemaClass.name, required: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: UserSchemaClass.name, required: true })
  sellerId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  platformFeeAmount: number;

  @Prop({ required: true, unique: true })
  stripePaymentIntentId: string;

  @Prop({ enum: ['pending', 'paid', 'failed'], default: 'pending' })
  status: OrderStatus;

  createdAt?: Date;
}

export const OrderMongooseSchema = SchemaFactory.createForClass(OrderSchemaClass);

OrderMongooseSchema.set('toJSON', {
  virtuals: true,
  transform: ((_doc: unknown, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    if (ret.artworkId && typeof ret.artworkId !== 'object') {
      ret.artworkId = String(ret.artworkId);
    }
    if (ret.buyerId && typeof ret.buyerId !== 'object') {
      ret.buyerId = String(ret.buyerId);
    }
    if (ret.sellerId && typeof ret.sellerId !== 'object') {
      ret.sellerId = String(ret.sellerId);
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  }) as (...args: unknown[]) => unknown,
});
