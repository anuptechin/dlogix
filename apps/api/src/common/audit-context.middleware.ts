import { Injectable, NestMiddleware } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { requestContext } from './request-context';

// Resolves the acting user (dev: first ADMIN/LOGISTICS seed user; real users
// arrive with M365 SSO in P0-3) and stores it in AsyncLocalStorage for the
// request, so audit records and the admin guard can read it.
@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: any, _res: any, next: () => void) {
    const ip =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      '';
    let userId: string | undefined;
    let role: string | undefined;
    try {
      // The signed-in user comes from the signed `dlx_uid` login cookie.
      // The `x-dev-user-email` impersonation header is honoured ONLY outside prod.
      const allowDevHeader = process.env.NODE_ENV !== 'production';
      const devEmail = allowDevHeader
        ? (req.headers?.['x-dev-user-email'] as string | undefined)
        : undefined;
      const cookieUid = req.signedCookies?.['dlx_uid'] as string | undefined;
      const u = devEmail
        ? await this.prisma.user.findFirst({
            where: { email: devEmail, isActive: true },
            select: { id: true, role: true },
          })
        : cookieUid
          ? await this.prisma.user.findFirst({
              where: { id: cookieUid, isActive: true },
              select: { id: true, role: true },
            })
          : null;
      userId = u?.id;
      role = u?.role;
    } catch {
      /* db not ready — proceed without actor */
    }
    requestContext.run({ userId, role, ip: String(ip) }, () => next());
  }
}
