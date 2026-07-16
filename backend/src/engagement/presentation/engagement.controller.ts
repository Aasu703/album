import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../users/presentation/decorators/current-user.decorator';
import { JwtAuthGuard, AuthenticatedRequest } from '../../users/presentation/guards/jwt-auth.guard';
import { ReactionsService } from '../application/reactions.service';
import { CommentsService } from '../application/comments.service';
import { ReactDto } from './dto/react.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller()
export class EngagementController {
  constructor(
    private readonly reactionsService: ReactionsService,
    private readonly commentsService: CommentsService,
  ) {}

  // ---- Reactions ----

  // Public: anyone can see reaction counts (and their own reaction, if authenticated separately via /me flows).
  @Get('artworks/:id/reactions')
  async getReactions(@Param('id') id: string) {
    const summary = await this.reactionsService.getSummary(id);
    return { success: true, data: summary };
  }

  @Post('artworks/:id/reactions')
  @UseGuards(JwtAuthGuard)
  async react(
    @Param('id') id: string,
    @Body() dto: ReactDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    const summary = await this.reactionsService.setReaction(id, user.sub, dto.emoji);
    return { success: true, data: summary };
  }

  @Delete('artworks/:id/reactions')
  @UseGuards(JwtAuthGuard)
  async unreact(@Param('id') id: string, @CurrentUser() user: AuthenticatedRequest['user']) {
    const summary = await this.reactionsService.removeReaction(id, user.sub);
    return { success: true, data: summary };
  }

  // ---- Comments ----

  @Get('artworks/:id/comments')
  async listComments(@Param('id') id: string, @Query('page') page?: string) {
    const result = await this.commentsService.list(id, page ? Number(page) : 1);
    return { success: true, data: result };
  }

  @Post('artworks/:id/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    const comment = await this.commentsService.create(id, user.sub, dto.text);
    return { success: true, data: { comment } };
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    await this.commentsService.remove(commentId, user.sub, user.role === 'ADMIN');
    return { success: true };
  }
}
