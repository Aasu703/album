import { NewUser, SellerStatus, User } from './user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  create(data: NewUser): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findBySellerStatus(status: SellerStatus): Promise<User[]>;
  findByStripeAccountId(stripeConnectAccountId: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User | null>;
}
