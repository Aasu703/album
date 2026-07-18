import { AuthProvider, NewUser, SellerStatus, User, UserRole } from './user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  create(data: NewUser): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByProviderId(provider: AuthProvider, providerId: string): Promise<User | null>;
  findBySellerStatus(status: SellerStatus): Promise<User[]>;
  findAll(filter?: { role?: UserRole; isBanned?: boolean }): Promise<User[]>;
  update(id: string, data: Partial<User>): Promise<User | null>;
}
