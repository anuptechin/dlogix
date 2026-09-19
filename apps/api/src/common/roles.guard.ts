import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { getReqCtx } from './request-context';

export const ROLES_KEY = 'roles';
/** Restrict a route/controller to the given roles (checked against the request-context role). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const role = getReqCtx()?.role as UserRole | undefined;
    if (role && roles.includes(role)) return true;
    throw new ForbiddenException('You do not have access to this resource.');
  }
}
