-- Internal D'Decor recipients notified on an award.
ALTER TABLE "awards" ADD COLUMN "internal_emails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
