import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Support both COLORWAY_SMTP_* (shared D'Decor mailbox) and generic SMTP_* names.
const env = (k: string) => process.env[k];
const SMTP_HOST = env('SMTP_HOST') ?? env('COLORWAY_SMTP_HOST');
const SMTP_PORT = Number(env('SMTP_PORT') ?? env('COLORWAY_SMTP_PORT') ?? 587);
const SMTP_USER = env('SMTP_USER') ?? env('COLORWAY_SMTP_USER');
const SMTP_PASS = env('SMTP_PASS') ?? env('COLORWAY_SMTP_PASS');

/**
 * Email delivery. EMAIL_TRANSPORT=smtp uses Office365 SMTP (STARTTLS on 587);
 * anything else (default 'console') logs to stdout so flows work without creds.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private readonly transport = process.env.EMAIL_TRANSPORT ?? 'console';
  private readonly from = process.env.EMAIL_FROM ?? SMTP_USER ?? 'logistics-portal@ddecor.com';
  private smtp?: Transporter;

  private smtpTransport(): Transporter | null {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      this.logger.warn('SMTP env not fully set — falling back to console email.');
      return null;
    }
    if (!this.smtp) {
      this.smtp = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // 465 = implicit TLS
        requireTLS: SMTP_PORT !== 465, // 587 → force STARTTLS (Office365)
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    }
    return this.smtp;
  }

  async send(msg: EmailMessage): Promise<{ transport: string }> {
    if (this.transport === 'smtp') {
      const t = this.smtpTransport();
      if (t) {
        try {
          await t.sendMail({
            from: this.from,
            to: msg.to,
            subject: msg.subject,
            text: msg.text,
            html: msg.html,
          });
          this.logger.log(`Sent "${msg.subject}" to ${msg.to} via SMTP`);
          return { transport: 'smtp' };
        } catch (e) {
          this.logger.error(`SMTP send failed (${msg.to}): ${e}`);
          throw e;
        }
      }
    }
    // console fallback
    this.logger.log(
      [
        '',
        '──────────── EMAIL ────────────',
        `From:    ${this.from}`,
        `To:      ${msg.to}`,
        `Subject: ${msg.subject}`,
        '',
        msg.text,
        '───────────────────────────────',
      ].join('\n'),
    );
    return { transport: 'console' };
  }
}
