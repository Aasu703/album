import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './application/payments.service';
import { PaymentsController } from './presentation/payments.controller';
import { ArtworkMongooseSchema, ArtworkSchemaClass } from '../artworks/infrastructure/artwork.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ArtworkSchemaClass.name, schema: ArtworkMongooseSchema }]),
    UsersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
