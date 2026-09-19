import { randomBytes } from 'crypto';

/**
 * Opaque, URL-safe vendor invite token (256 bits of entropy).
 * NOTE: stored as-is for the dev build. For production, store a SHA-256 hash
 * and match by hashing the incoming token (see Phase 1 plan §7).
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}
