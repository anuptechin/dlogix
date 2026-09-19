import { AsyncLocalStorage } from 'node:async_hooks';

// Per-request context so the Prisma audit middleware can attribute changes
// to the acting user without threading it through every call.
export interface ReqCtx {
  userId?: string;
  role?: string;
  ip?: string;
}

export const requestContext = new AsyncLocalStorage<ReqCtx>();
export const getReqCtx = (): ReqCtx | undefined => requestContext.getStore();
