import { IsIn } from 'class-validator';
import { ALLOWED_EMOJIS } from '../../infrastructure/reaction.schema';
import type { ReactionEmoji } from '../../infrastructure/reaction.schema';

export class ReactDto {
  @IsIn(ALLOWED_EMOJIS as unknown as string[])
  emoji: ReactionEmoji;
}
