import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  readonly client: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    // Instantiated even without a real key so the app can boot; calls will fail
    // safely at the Stripe API layer until a real test-mode key is configured.
    this.client = new Stripe(secretKey || 'sk_test_mock', {
      apiVersion: '2026-06-24.dahlia' as Stripe.LatestApiVersion,
    });
  }

  /** Creates a Stripe Connect Express account for a newly approved seller. */
  async createExpressAccount(email: string): Promise<string> {
    const account = await this.client.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account.id;
  }

  /** Creates a fresh Stripe-hosted onboarding link for a connected account. */
  async createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
    const link = await this.client.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return link.url;
  }

  /** Cryptographically verifies and parses an incoming Stripe webhook payload. */
  constructWebhookEvent(payload: Buffer, signature: string, webhookSecret: string): Stripe.Event {
    return this.client.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
