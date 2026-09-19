import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getReqCtx } from '../../common/request-context';

const WRITE_ACTIONS = new Set([
  'create',
  'update',
  'delete',
  'upsert',
  'createMany',
  'updateMany',
  'deleteMany',
]);
const ACTION_LABEL: Record<string, string> = {
  create: 'CREATE',
  update: 'UPDATE',
  delete: 'DELETE',
  upsert: 'UPSERT',
  createMany: 'CREATE_MANY',
  updateMany: 'UPDATE_MANY',
  deleteMany: 'DELETE_MANY',
};
// Models whose writes we don't audit (avoid recursion / noise / secrets).
const SKIP_MODELS = new Set(['AuditLog', 'LoginOtp']);
// Never store secrets in the audit trail.
const REDACT_KEYS = new Set(['passwordHash', 'password', 'codeHash', 'inviteToken']);

function redact(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(redact);
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = REDACT_KEYS.has(k) ? '***' : redact(v);
    }
    return out;
  }
  return obj;
}

// JSON-safe snapshot (Decimal → string, Date → ISO), secrets redacted, size-guarded.
function snapshot(value: unknown): unknown {
  if (value == null) return undefined;
  try {
    const json = redact(JSON.parse(JSON.stringify(value)));
    const str = JSON.stringify(json);
    if (str.length > 20000) return { _truncated: true, bytes: str.length };
    return json;
  } catch {
    return undefined;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('AuditTrail');

  async onModuleInit() {
    await this.$connect();
    this.installAuditMiddleware();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Records every create/update/delete to the audit_log, attributed to the
  // acting user from the request context. Failures never block the operation.
  private installAuditMiddleware() {
    this.$use(async (params, next) => {
      const model = params.model;
      const action = params.action;
      if (!model || SKIP_MODELS.has(model) || !WRITE_ACTIONS.has(action)) {
        return next(params);
      }

      const single = action === 'update' || action === 'delete';
      const delegate: any = (this as any)[
        model.charAt(0).toLowerCase() + model.slice(1)
      ];
      let before: unknown;
      if (single && params.args?.where && delegate?.findUnique) {
        before = await delegate
          .findUnique({ where: params.args.where })
          .catch(() => null);
      }

      const result = await next(params);

      try {
        const ctx = getReqCtx();
        const bulk =
          action === 'createMany' ||
          action === 'updateMany' ||
          action === 'deleteMany';
        const entityId = !bulk
          ? (result?.id ?? params.args?.where?.id ?? null)
          : null;
        const after = bulk
          ? { count: result?.count, where: snapshot(params.args?.where) }
          : action === 'delete'
            ? undefined
            : snapshot(result);

        await this.auditLog.create({
          data: {
            actorId: ctx?.userId ?? null,
            action: ACTION_LABEL[action] ?? action.toUpperCase(),
            entity: model,
            entityId: typeof entityId === 'string' ? entityId : null,
            before: before ? (snapshot(before) as any) : undefined,
            after: (after as any) ?? undefined,
          },
        });
      } catch (e) {
        this.logger.warn(`Audit write failed for ${model}.${action}: ${e}`);
      }
      return result;
    });
  }
}
