import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NewUser, User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import { UserDocument, UserSchemaClass } from './user.schema';

function toDomain(doc: UserDocument): User {
  return {
    id: String(doc._id),
    email: doc.email,
    passwordHash: doc.passwordHash,
    firstName: doc.firstName,
    lastName: doc.lastName,
    phone: doc.phone ?? null,
    role: doc.role,
    sellerStatus: doc.sellerStatus,
    stripeConnectAccountId: doc.stripeConnectAccountId ?? null,
    stripeCustomerId: doc.stripeCustomerId ?? null,
    createdAt: doc.createdAt ?? new Date(),
    failedLoginAttempts: doc.failedLoginAttempts ?? 0,
    lockoutUntil: doc.lockoutUntil ?? null,
    isMfaEnabled: doc.isMfaEnabled ?? false,
    mfaSecret: doc.mfaSecret ?? null,
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
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? undefined,
    });
    return toDomain(created);
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.userModel.findOne({ email: email.toLowerCase().trim() });
    return doc ? toDomain(doc) : null;
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.userModel.findById(id);
    return doc ? toDomain(doc) : null;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const doc = await this.userModel.findByIdAndUpdate(id, data, { new: true });
    return doc ? toDomain(doc) : null;
  }
}
