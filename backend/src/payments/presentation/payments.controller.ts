import { Body, Controller, Post, Headers, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from '../application/payments.service';
import { JwtAuthGuard, AuthenticatedRequest } from '../../users/presentation/guards/jwt-auth.guard';
import { CurrentUser } from '../../users/presentation/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Task 2: Secure Payment Intent Creation
  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  async createIntent(
    @Body('artworkId') artworkId: string,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    return await this.paymentsService.createPaymentIntent(artworkId, user.sub);
  }

  // Task 3: Cryptographically Secure Stripe Webhook
  @Post('webhook')
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    // Note: The rawBody is required by Stripe to construct the event securely.
    // The main.ts file must have rawBody: true configured for the Nest application.
    return await this.paymentsService.handleWebhook(signature, (req as any).rawBody);
  }
}
