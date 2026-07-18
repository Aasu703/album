import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { AuthProvider, SellerStatus, UserRole } from '../domain/user.entity';

export type UserDocument = HydratedDocument<UserSchemaClass>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'users' })
export class UserSchemaClass {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  // Optional: OAuth-only accounts (e.g. Google) never set a local password.
  @Prop()
  passwordHash?: string;

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

  @Prop({ default: false })
  isBanned: boolean;

  @Prop()
  bannedReason?: string;

  createdAt?: Date;

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop()
  lockoutUntil?: Date;

  @Prop({ default: false })
  isMfaEnabled: boolean;

  @Prop()
  mfaSecret?: string;

  @Prop({ enum: ['local', 'google'], default: 'local' })
  provider: AuthProvider;

  @Prop()
  providerId?: string;

  // Password-reset OTP: store only the bcrypt hash, never the raw code.
  @Prop()
  resetOtpHash?: string;

  @Prop()
  resetOtpExpires?: Date;
}

export const UserMongooseSchema = SchemaFactory.createForClass(UserSchemaClass);

UserMongooseSchema.index({ role: 1 });
UserMongooseSchema.index({ sellerStatus: 1 });
// Look up a linked OAuth identity quickly; sparse so local-only accounts are excluded.
UserMongooseSchema.index({ provider: 1, providerId: 1 }, { sparse: true });

UserMongooseSchema.set('toJSON', {
  virtuals: true,
  transform: ((_doc: unknown, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.mfaSecret;
    delete ret.resetOtpHash;
    delete ret.resetOtpExpires;
    return ret;
  }) as (...args: unknown[]) => unknown,
});
