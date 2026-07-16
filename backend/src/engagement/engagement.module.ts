import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArtworkMongooseSchema, ArtworkSchemaClass } from '../artworks/infrastructure/artwork.schema';
import { ReactionMongooseSchema, ReactionSchemaClass } from './infrastructure/reaction.schema';
import { CommentMongooseSchema, CommentSchemaClass } from './infrastructure/comment.schema';
import { ReactionsService } from './application/reactions.service';
import { CommentsService } from './application/comments.service';
import { EngagementController } from './presentation/engagement.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ArtworkSchemaClass.name, schema: ArtworkMongooseSchema },
      { name: ReactionSchemaClass.name, schema: ReactionMongooseSchema },
      { name: CommentSchemaClass.name, schema: CommentMongooseSchema },
    ]),
    UsersModule,
  ],
  controllers: [EngagementController],
  providers: [ReactionsService, CommentsService],
})
export class EngagementModule {}
