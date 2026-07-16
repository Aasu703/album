import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ArtworkSchemaClass } from '../../artworks/infrastructure/artwork.schema';
import { ReactionEmoji, ReactionSchemaClass } from '../infrastructure/reaction.schema';

export interface ReactionSummary {
  counts: Record<string, number>;
  total: number;
  myReaction: ReactionEmoji | null;
}

@Injectable()
export class ReactionsService {
  constructor(
    @InjectModel(ArtworkSchemaClass.name) private readonly artworkModel: Model<ArtworkSchemaClass>,
    @InjectModel(ReactionSchemaClass.name) private readonly reactionModel: Model<ReactionSchemaClass>,
  ) {}

  private async assertArtworkExists(artworkId: string): Promise<void> {
    const exists = await this.artworkModel.exists({ _id: artworkId });
    if (!exists) {
      throw new NotFoundException('Artwork not found.');
    }
  }

  async setReaction(artworkId: string, userId: string, emoji: ReactionEmoji): Promise<ReactionSummary> {
    await this.assertArtworkExists(artworkId);

    await this.reactionModel.findOneAndUpdate(
      { artworkId: new Types.ObjectId(artworkId), userId: new Types.ObjectId(userId) },
      { $set: { emoji } },
      { upsert: true, new: true },
    );

    return this.getSummary(artworkId, userId);
  }

  async removeReaction(artworkId: string, userId: string): Promise<ReactionSummary> {
    await this.assertArtworkExists(artworkId);

    await this.reactionModel.deleteOne({
      artworkId: new Types.ObjectId(artworkId),
      userId: new Types.ObjectId(userId),
    });

    return this.getSummary(artworkId, userId);
  }

  async getSummary(artworkId: string, currentUserId?: string): Promise<ReactionSummary> {
    const artworkObjectId = new Types.ObjectId(artworkId);
    const [grouped, mine] = await Promise.all([
      this.reactionModel.aggregate<{ _id: string; count: number }>([
        { $match: { artworkId: artworkObjectId } },
        { $group: { _id: '$emoji', count: { $sum: 1 } } },
      ]),
      currentUserId
        ? this.reactionModel.findOne({ artworkId: artworkObjectId, userId: new Types.ObjectId(currentUserId) })
        : Promise.resolve(null),
    ]);

    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of grouped) {
      counts[row._id] = row.count;
      total += row.count;
    }

    return { counts, total, myReaction: (mine?.emoji as ReactionEmoji) ?? null };
  }
}
