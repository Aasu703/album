import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from '../mail/mail.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AuthService } from './application/auth.service';
import { USER_REPOSITORY } from './domain/user.repository';
import { UserMongooseSchema, UserSchemaClass } from './infrastructure/user.schema';
import { UserRepositoryImpl } from './infrastructure/user.repository.impl';
import { AuthController } from './presentation/auth.controller';
import { UsersController } from './presentation/users.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './presentation/guards/optional-jwt-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';
import { GoogleStrategy } from './presentation/strategies/google.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserSchemaClass.name, schema: UserMongooseSchema }]),
    JwtModule.register({}),
    // Stateless OAuth: no server-side passport session — we mint our own JWT cookies.
    PassportModule.register({ session: false }),
    MailModule,
    CloudinaryModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
    GoogleStrategy,
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
  ],
  exports: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard, USER_REPOSITORY, JwtModule],
})
export class UsersModule {}
