import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Sends transactional email. If SMTP credentials are configured it delivers real email
 * via nodemailer; otherwise it falls back to logging the message to the server console so
 * the app is fully functional in local development without any external mail service.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.from = this.configService.get<string>('SMTP_FROM') ?? 'Painting Gallery <no-reply@gallery.test>';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: { user, pass },
      });
      this.logger.log(`SMTP configured — sending real email via ${host}.`);
    } else {
      this.transporter = null;
      this.logger.warn('SMTP not configured — password-reset codes will be logged to the console.');
    }
  }

  async sendPasswordResetOtp(to: string, otp: string, ttlMinutes: number): Promise<void> {
    const subject = 'Your password reset code';
    const text =
      `You (or someone) requested a password reset for your Painting Gallery account.\n\n` +
      `Your one-time code is: ${otp}\n\n` +
      `It expires in ${ttlMinutes} minutes. If you didn't request this, you can ignore this email.`;

    if (!this.transporter) {
      // Dev fallback: surface the code so the flow can be exercised without SMTP.
      this.logger.warn(`[DEV] Password reset code for ${to}: ${otp} (expires in ${ttlMinutes}m)`);
      return;
    }

    await this.transporter.sendMail({ from: this.from, to, subject, text });
  }

  /** Fired after a password reset actually succeeds, so a takeover is at least detectable
   * by the real account owner even though the reset itself required no prior session. */
  async sendPasswordChangedNotification(to: string): Promise<void> {
    const subject = 'Your password was changed';
    const text =
      `Your Painting Gallery account password was just changed.\n\n` +
      `If this was you, no action is needed. If you didn't do this, your account may be ` +
      `compromised — contact support immediately and consider that any other device you're ` +
      `still signed in on has now been signed out.`;

    if (!this.transporter) {
      this.logger.warn(`[DEV] Password-changed notification for ${to} (not sent — no SMTP configured).`);
      return;
    }

    await this.transporter.sendMail({ from: this.from, to, subject, text });
  }
}
