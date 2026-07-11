import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './application/auth.service';
import { USER_REPOSITORY } from './domain/user.repository';
import { UserMongooseSchema, UserSchemaClass } from './infrastructure/user.schema';
import { UserRepositoryImpl } from './infrastructure/user.repository.impl';
import { AuthController } from './presentation/auth.controller';
import { UsersController } from './presentation/users.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserSchemaClass.name, schema: UserMongooseSchema }]),
    JwtModule.register({}),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, USER_REPOSITORY],
})
export class UsersModule {}
