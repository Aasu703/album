import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ArtworkSchemaClass } from '../../artworks/infrastructure/artwork.schema';
import { CommentSchemaClass } from '../infrastructure/comment.schema';

const PAINTER_FIELDS = 'firstName lastName';

/** Strips control characters and collapses excess whitespace. Rendering is still
 * handled as plain text on the frontend (React auto-escapes), this is defense-in-depth. */
function sanitizeText(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(ArtworkSchemaClass.name) private readonly artworkModel: Model<ArtworkSchemaClass>,
    @InjectModel(CommentSchemaClass.name) private readonly commentModel: Model<CommentSchemaClass>,
  ) {}

  async create(artworkId: string, authorId: string, text: string) {
    const exists = await this.artworkModel.exists({ _id: artworkId });
    if (!exists) {
      throw new NotFoundException('Artwork not found.');
    }

    const clean = sanitizeText(text);
    if (!clean) {
      throw new NotFoundException('Comment cannot be empty.');
    }

    const created = await this.commentModel.create({
      artworkId: new Types.ObjectId(artworkId),
      authorId: new Types.ObjectId(authorId),
      text: clean,
    });

    return created.populate('authorId', PAINTER_FIELDS);
  }

  async list(artworkId: string, page = 1, limit = 20) {
    const filter = { artworkId: new Types.ObjectId(artworkId) };
    const [items, total] = await Promise.all([
      this.commentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', PAINTER_FIELDS),
      this.commentModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async remove(commentId: string, userId: string, isAdmin: boolean) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }
    if (!isAdmin && comment.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments.');
    }
    await comment.deleteOne();
  }
}
