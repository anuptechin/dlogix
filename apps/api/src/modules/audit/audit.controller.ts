import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getReqCtx } from '../../common/request-context';
import { Roles, RolesGuard } from '../../common/roles.guard';

// Reports / activity log — Admin & Manager only; Admins' own activity is excluded.
@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  private async adminIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT)
  async list(
    @Query('limit') limit?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('q') q?: string,
  ) {
    const take = Math.min(Number(limit) || 200, 1000);
    const admins = await this.adminIds();
    const where: Prisma.AuditLogWhereInput = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    // Never surface Admin activity in the report.
    if (actorId && !admins.includes(actorId)) where.actorId = actorId;
    else where.actorId = { notIn: admins };
    if (q) where.entityId = { contains: q };

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { at: 'desc' },
      take,
    });
    const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))] as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => ({
      id: r.id,
      actor: r.actorId ? (byId.get(r.actorId)?.name ?? 'Unknown') : 'System',
      actorEmail: r.actorId ? (byId.get(r.actorId)?.email ?? null) : null,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      before: r.before,
      after: r.after,
      at: r.at,
    }));
  }

  @Get('facets')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT)
  async facets() {
    const [entities, actions, actors] = await Promise.all([
      this.prisma.auditLog.findMany({ distinct: ['entity'], select: { entity: true }, orderBy: { entity: 'asc' } }),
      this.prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
      this.prisma.user.findMany({
        where: { isActive: true, role: { not: UserRole.ADMIN } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      entities: entities.map((e) => e.entity),
      actions: actions.map((a) => a.action),
      actors,
    };
  }

  // Records a login event for any signed-in user.
  @Post('login-event')
  async loginEvent(@Body() body?: { note?: string }) {
    const ctx = getReqCtx();
    if (!ctx?.userId) return { ok: false };
    await this.prisma.auditLog.create({
      data: {
        actorId: ctx.userId,
        action: 'LOGIN',
        entity: 'Session',
        entityId: ctx.userId,
        after: { ip: ctx.ip ?? null, note: body?.note ?? 'Signed in' },
      },
    });
    return { ok: true };
  }
}
