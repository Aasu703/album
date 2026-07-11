import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './application/payments.service';
import { PaymentsController } from './presentation/payments.controller';
import { ArtworkMongooseSchema, ArtworkSchemaClass } from '../artworks/infrastructure/artwork.schema';
import { UsersModule } from '../users/users.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ArtworkSchemaClass.name, schema: ArtworkMongooseSchema }]),
    UsersModule,
    StripeModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
