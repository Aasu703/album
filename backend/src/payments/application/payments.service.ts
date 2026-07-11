import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { ArtworkSchemaClass } from '../../artworks/infrastructure/artwork.schema';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @InjectModel(ArtworkSchemaClass.name)
    private artworkModel: Model<ArtworkSchemaClass>,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    // We instantiate Stripe without throwing an error if the key is missing to allow the app to boot, 
    // but the payment endpoints will fail safely if it's missing.
    this.stripe = new Stripe(stripeKey || 'sk_test_mock', {
      apiVersion: '2026-06-24.dahlia' as any,
    });
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

    try {
      // Security: We create the intent on the backend using the price from the database, 
      // not from the client request. Stripe amounts are in cents.
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amountToCharge * 100),
        currency: 'usd',
        metadata: {
          artworkId: artwork.id,
          userId: userId,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
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
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Handle the event
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

    return { received: true };
  }
}
