import { BadRequestException, Inject, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { ArtworkSchemaClass } from '../../artworks/infrastructure/artwork.schema';
import { AuthService } from '../../users/application/auth.service';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { StripeService } from '../../stripe/stripe.service';

const DEFAULT_PLATFORM_FEE_PERCENT = 10;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly stripeService: StripeService,
    private readonly authService: AuthService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @InjectModel(ArtworkSchemaClass.name)
    private artworkModel: Model<ArtworkSchemaClass>,
  ) {}

  private platformFeePercent(): number {
    const configured = this.configService.get<string>('PLATFORM_FEE_PERCENT');
    const parsed = configured ? Number(configured) : NaN;
    return Number.isFinite(parsed) ? parsed : DEFAULT_PLATFORM_FEE_PERCENT;
  }

  async createPaymentIntent(artworkId: string, userId: string) {
    const artwork = await this.artworkModel.findById(artworkId);

    if (!artwork) {
      throw new NotFoundException('Artwork not found');
    }

    if (artwork.status === 'SOLD') {
      throw new BadRequestException('Artwork is already sold');
    }

    let amountToCharge = 0;

    if (artwork.listingType === 'FOR_SALE') {
      amountToCharge = artwork.price || 0;
    } else if (artwork.listingType === 'AUCTION') {
      // Security Check: Only the highest bidder can pay for the auction once it has ended
      if (!artwork.auctionEndTime || new Date() <= artwork.auctionEndTime) {
        throw new BadRequestException('Auction has not ended yet.');
      }
      if (artwork.bidderId?.toString() !== userId) {
        throw new BadRequestException('You are not the highest bidder.');
      }
      amountToCharge = artwork.currentHighestBid || 0;
    } else {
      throw new BadRequestException('This artwork is not available for purchase');
    }

    if (amountToCharge <= 0) {
      throw new BadRequestException('Invalid artwork price');
    }

    const seller = await this.userRepository.findById(artwork.painterId.toString());
    if (!seller?.stripeConnectAccountId || !seller.stripeChargesEnabled) {
      throw new BadRequestException('The seller has not finished setting up payouts yet.');
    }

    const amountInCents = Math.round(amountToCharge * 100);
    const applicationFeeAmount = Math.round((amountInCents * this.platformFeePercent()) / 100);

    try {
      // Security: We create the intent on the backend using the price from the database,
      // not from the client request. Stripe amounts are in cents. Using a destination charge
      // (transfer_data.destination) so funds route to the seller's own connected account,
      // minus our platform fee, without the platform ever custodying the full amount.
      const paymentIntent = await this.stripeService.client.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: seller.stripeConnectAccountId,
        },
        metadata: {
          artworkId: artwork.id,
          userId: userId,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch {
      throw new InternalServerErrorException('Failed to create payment intent');
    }
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new InternalServerErrorException('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      // Security Check: Cryptographically verify the webhook signature
      event = this.stripeService.constructWebhookEvent(payload, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid signature';
      throw new BadRequestException(`Webhook Error: ${message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const artworkId = paymentIntent.metadata.artworkId;
      if (artworkId) {
        // Securely mark the artwork as sold upon confirmed payment
        await this.artworkModel.findByIdAndUpdate(artworkId, {
          status: 'SOLD',
        });
      }
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      await this.authService.setStripeChargesEnabled(account.id, Boolean(account.charges_enabled));
    }

    return { received: true };
  }
}
