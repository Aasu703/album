import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthProvider, NewUser, SellerStatus, User, UserRole } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import { UserDocument, UserSchemaClass } from './user.schema';

function toDomain(doc: UserDocument): User {
  return {
    id: String(doc._id),
    email: doc.email,
    passwordHash: doc.passwordHash ?? null,
    firstName: doc.firstName,
    lastName: doc.lastName,
    phone: doc.phone ?? null,
    role: doc.role,
    sellerStatus: doc.sellerStatus,
    isBanned: doc.isBanned ?? false,
    bannedReason: doc.bannedReason ?? null,
    createdAt: doc.createdAt ?? new Date(),
    failedLoginAttempts: doc.failedLoginAttempts ?? 0,
    lockoutUntil: doc.lockoutUntil ?? null,
    isMfaEnabled: doc.isMfaEnabled ?? false,
    mfaSecret: doc.mfaSecret ?? null,
    provider: doc.provider ?? 'local',
    providerId: doc.providerId ?? null,
    resetOtpHash: doc.resetOtpHash ?? null,
    resetOtpExpires: doc.resetOtpExpires ?? null,
    avatarUrl: doc.avatarUrl ?? null,
    avatarPublicId: doc.avatarPublicId ?? null,
  };
}

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly userModel: Model<UserSchemaClass>,
  ) {}

  async create(data: NewUser): Promise<User> {
    const created = await this.userModel.create({
      email: data.email,
      passwordHash: data.passwordHash ?? undefined,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? undefined,
      provider: data.provider ?? 'local',
      providerId: data.providerId ?? undefined,
    });
    return toDomain(created);
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.userModel.findOne({ email: email.toLowerCase().trim() });
    return doc ? toDomain(doc) : null;
  }

  async findByProviderId(provider: AuthProvider, providerId: string): Promise<User | null> {
    const doc = await this.userModel.findOne({ provider, providerId });
    return doc ? toDomain(doc) : null;
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.userModel.findById(id);
    return doc ? toDomain(doc) : null;
  }

  async findBySellerStatus(status: SellerStatus): Promise<User[]> {
    const docs = await this.userModel.find({ sellerStatus: status }).sort({ createdAt: 1 });
    return docs.map(toDomain);
  }

  async findAll(filter?: { role?: UserRole; isBanned?: boolean }): Promise<User[]> {
    const query: Record<string, unknown> = {};
    if (filter?.role) query.role = filter.role;
    if (filter?.isBanned !== undefined) query.isBanned = filter.isBanned;
    const docs = await this.userModel.find(query).sort({ createdAt: -1 });
    return docs.map(toDomain);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const doc = await this.userModel.findByIdAndUpdate(id, data, { new: true });
    return doc ? toDomain(doc) : null;
  }
}
