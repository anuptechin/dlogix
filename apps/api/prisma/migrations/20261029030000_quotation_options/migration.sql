-- Multiple shipping/air-line options per quote + per-line currency.
CREATE TABLE "quotation_options" (
  "id" TEXT NOT NULL,
  "quotation_id" TEXT NOT NULL,
  "label" TEXT,
  "shipping_line" TEXT,
  "vessel_name" TEXT,
  "etd" DATE,
  "eta" DATE,
  "transit_time_days" INTEGER,
  "transshipments" INTEGER,
  "rate_type" "RateType",
  "free_detention_origin_days" INTEGER,
  "free_detention_dest_days" INTEGER,
  "free_demurrage_dest_days" INTEGER,
  "total_inr" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "quotation_options_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quotation_options_quotation_id_idx" ON "quotation_options"("quotation_id");
ALTER TABLE "quotation_options"
  ADD CONSTRAINT "quotation_options_quotation_id_fkey"
  FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quotation_lines" ADD COLUMN "quotation_option_id" TEXT;
ALTER TABLE "quotation_lines" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "quotation_lines"
  ADD CONSTRAINT "quotation_lines_quotation_option_id_fkey"
  FOREIGN KEY ("quotation_option_id") REFERENCES "quotation_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "awards" ADD COLUMN "quotation_option_id" TEXT;
ALTER TABLE "awards"
  ADD CONSTRAINT "awards_quotation_option_id_fkey"
  FOREIGN KEY ("quotation_option_id") REFERENCES "quotation_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
