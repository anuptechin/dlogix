import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getReqCtx } from './request-context';

export const IS_PUBLIC = 'isPublic';
/** Mark a route/controller as reachable without a signed-in session. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * Global authentication: every route requires a valid session (resolved from
 * the signed login cookie into the request context) unless marked @Public().
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    if (getReqCtx()?.userId) return true;
    throw new UnauthorizedException('Sign in required.');
  }
}
