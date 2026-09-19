-- CreateEnum
CREATE TYPE "CourierCarrier" AS ENUM ('DHL', 'FEDEX');

-- CreateTable
CREATE TABLE "courier_rate_cards" (
    "id" TEXT NOT NULL,
    "carrier" "CourierCarrier" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "volumetric_divisor_cm" INTEGER NOT NULL DEFAULT 5000,
    "volumetric_divisor_in" INTEGER NOT NULL DEFAULT 139,
    "flat_max_weight_kg" DECIMAL(10,2) NOT NULL DEFAULT 30,
    "surcharge_per_kg" DECIMAL(12,4) NOT NULL DEFAULT 150,
    "fuel_pct" DECIMAL(6,4) NOT NULL DEFAULT 0.30,
    "gst_pct" DECIMAL(6,4) NOT NULL DEFAULT 0.18,
    "margin_x" DECIMAL(6,3) NOT NULL DEFAULT 2,
    "usd_rate" DECIMAL(10,4) NOT NULL DEFAULT 53,
    "gbp_rate" DECIMAL(10,4) NOT NULL DEFAULT 70,
    "eur_rate" DECIMAL(10,4) NOT NULL DEFAULT 60,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_rate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_zones" (
    "id" TEXT NOT NULL,
    "rate_card_id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "zone" TEXT NOT NULL,

    CONSTRAINT "courier_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_rate_rows" (
    "id" TEXT NOT NULL,
    "rate_card_id" TEXT NOT NULL,
    "weight_kg" DECIMAL(12,3) NOT NULL,
    "zone" TEXT NOT NULL,
    "price" DECIMAL(14,4) NOT NULL,
    "per_kg" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "courier_rate_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courier_rate_cards_carrier_key" ON "courier_rate_cards"("carrier");

-- CreateIndex
CREATE INDEX "courier_zones_rate_card_id_country_idx" ON "courier_zones"("rate_card_id", "country");

-- CreateIndex
CREATE UNIQUE INDEX "courier_zones_rate_card_id_country_key" ON "courier_zones"("rate_card_id", "country");

-- CreateIndex
CREATE INDEX "courier_rate_rows_rate_card_id_zone_weight_kg_idx" ON "courier_rate_rows"("rate_card_id", "zone", "weight_kg");

-- CreateIndex
CREATE UNIQUE INDEX "courier_rate_rows_rate_card_id_weight_kg_zone_key" ON "courier_rate_rows"("rate_card_id", "weight_kg", "zone");

-- AddForeignKey
ALTER TABLE "courier_zones" ADD CONSTRAINT "courier_zones_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "courier_rate_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_rate_rows" ADD CONSTRAINT "courier_rate_rows_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "courier_rate_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

