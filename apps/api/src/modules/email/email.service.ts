import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Read env at CALL time (not import time) — ConfigModule loads .env during
// bootstrap, after this file is first imported. Supports SMTP_* and COLORWAY_SMTP_*.
function smtpConfig() {
  const host = process.env.SMTP_HOST ?? process.env.COLORWAY_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? process.env.COLORWAY_SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER ?? process.env.COLORWAY_SMTP_USER;
  const pass = process.env.SMTP_PASS ?? process.env.COLORWAY_SMTP_PASS;
  return { host, port, user, pass };
}

/**
 * Email delivery. EMAIL_TRANSPORT=smtp uses Office365 SMTP (STARTTLS on 587);
 * anything else (default 'console') logs to stdout.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private smtp?: Transporter;

  private smtpTransport(): Transporter | null {
    const { host, port, user, pass } = smtpConfig();
    if (!host || !user || !pass) {
      this.logger.warn('SMTP env not fully set — falling back to console email.');
      return null;
    }
    if (!this.smtp) {
      this.smtp = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = implicit TLS
        requireTLS: port !== 465, // 587 → force STARTTLS (Office365)
        auth: { user, pass },
      });
    }
    return this.smtp;
  }

  async send(msg: EmailMessage): Promise<{ transport: string }> {
    const transport = process.env.EMAIL_TRANSPORT ?? 'console';
    const from =
      process.env.EMAIL_FROM ?? smtpConfig().user ?? 'logistics-portal@ddecor.com';

    if (transport === 'smtp') {
      const t = this.smtpTransport();
      if (t) {
        try {
          await t.sendMail({
            from,
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
        `From:    ${from}`,
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
