import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RequestOtpDto, VerifyOtpDto } from './dto/login.dto';
import { getReqCtx } from '../../common/request-context';
import { Public } from '../../common/auth.guard';

const COOKIE = 'dlx_uid';
const COOKIE_OPTS = {
  httpOnly: true,
  signed: true, // HMAC-signed with SESSION_SECRET — not forgeable
  secure: process.env.NODE_ENV === 'production', // HTTPS-only in prod
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 3600 * 1000, // 7 days
};

type CookieRes = {
  cookie: (name: string, value: string, opts?: unknown) => void;
  clearCookie: (name: string, opts?: unknown) => void;
};

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ── OTP login (primary) ──
  @Post('request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.email);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: CookieRes) {
    const user = await this.auth.verifyOtp(dto.email, dto.code);
    res.cookie(COOKIE, user.id, COOKIE_OPTS);
    return user;
  }

  // ── Password login (fallback) ──
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: CookieRes) {
    const user = await this.auth.validate(dto.email, dto.password);
    res.cookie(COOKIE, user.id, COOKIE_OPTS);
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: CookieRes) {
    res.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  async me() {
    const ctx = getReqCtx();
    if (!ctx?.userId) throw new UnauthorizedException('Not signed in.');
    const user = await this.auth.byId(ctx.userId);
    if (!user) throw new UnauthorizedException('Session expired.');
    return user;
  }
}
