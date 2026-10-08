-- Add END_USER role (calculator-only, quote-visible user).
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'END_USER';
