-- Add CC (secondary) email addresses to vendors (Cc'd on quote invites).
ALTER TABLE "vendors" ADD COLUMN "cc_emails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
