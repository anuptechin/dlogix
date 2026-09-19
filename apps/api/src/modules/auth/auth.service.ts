import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const OTP_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ── OTP login ──
  async requestOtp(email: string): Promise<{ ok: true }> {
    const e = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: e } });
    // Don't reveal whether the email exists.
    if (!user || !user.isActive) return { ok: true };

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = bcrypt.hashSync(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000);

    // Invalidate any earlier live codes for this email, then issue a fresh one.
    await this.prisma.loginOtp.updateMany({
      where: { email: e, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.loginOtp.create({ data: { email: e, codeHash, expiresAt } });

    await this.email.send({
      to: user.email,
      subject: `Your Dlogix sign-in code: ${code}`,
      text: [
        `Hello ${user.name},`,
        '',
        `Your Dlogix verification code is: ${code}`,
        `It is valid for ${OTP_TTL_MIN} minutes.`,
        '',
        `If you didn't try to sign in, you can ignore this email.`,
        '',
        `— Dlogix`,
      ].join('\n'),
      html: `<div style="font-family:Segoe UI,Arial,sans-serif;color:#16273f">
        <p>Hello ${user.name},</p>
        <p>Your Dlogix verification code is:</p>
        <p style="font-size:30px;font-weight:700;letter-spacing:6px;color:#1e7fe6">${code}</p>
        <p style="color:#5a6b82">Valid for ${OTP_TTL_MIN} minutes. If you didn't try to sign in, ignore this email.</p>
        <p style="color:#5a6b82">— Dlogix</p>
      </div>`,
    });
    return { ok: true };
  }

  async verifyOtp(email: string, code: string): Promise<PublicUser> {
    const e = email.toLowerCase().trim();
    const otp = await this.prisma.loginOtp.findFirst({
      where: { email: e, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new UnauthorizedException('No active code — request a new one.');
    if (otp.expiresAt < new Date())
      throw new UnauthorizedException('This code has expired. Request a new one.');
    if (otp.attempts >= MAX_ATTEMPTS)
      throw new UnauthorizedException('Too many attempts. Request a new code.');

    if (!bcrypt.compareSync(code.trim(), otp.codeHash)) {
      await this.prisma.loginOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect code.');
    }
    await this.prisma.loginOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { email: e } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account is not active.');
    return this.publicUser(user);
  }

  // ── Password login (kept as a fallback; UI uses OTP) ──
  async validate(email: string, password: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password.');
    return this.publicUser(user);
  }

  async byId(id: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user && user.isActive ? this.publicUser(user) : null;
  }

  private publicUser(u: User): PublicUser {
    return { id: u.id, name: u.name, email: u.email, role: u.role };
  }
}
