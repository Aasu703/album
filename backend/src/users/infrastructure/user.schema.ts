import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { SellerStatus, UserRole } from '../domain/user.entity';

export type UserDocument = HydratedDocument<UserSchemaClass>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'users' })
export class UserSchemaClass {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ enum: ['USER', 'VERIFIED_ARTIST', 'ADMIN'], default: 'USER' })
  role: UserRole;

  @Prop({ enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' })
  sellerStatus: SellerStatus;

  @Prop()
  stripeConnectAccountId?: string;

  @Prop()
  stripeCustomerId?: string;

  @Prop({ default: false })
  stripeChargesEnabled: boolean;

  createdAt?: Date;

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop()
  lockoutUntil?: Date;

  @Prop({ default: false })
  isMfaEnabled: boolean;

  @Prop()
  mfaSecret?: string;
}

export const UserMongooseSchema = SchemaFactory.createForClass(UserSchemaClass);

UserMongooseSchema.set('toJSON', {
  virtuals: true,
  transform: ((_doc: unknown, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.mfaSecret;
    return ret;
  }) as (...args: unknown[]) => unknown,
});
