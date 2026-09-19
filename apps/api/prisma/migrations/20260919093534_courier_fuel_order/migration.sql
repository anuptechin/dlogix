-- CreateEnum
CREATE TYPE "CourierFuelOrder" AS ENUM ('SURCHARGE_THEN_FUEL', 'FUEL_THEN_SURCHARGE');

-- AlterTable
ALTER TABLE "courier_rate_cards" ADD COLUMN     "fuel_order" "CourierFuelOrder" NOT NULL DEFAULT 'SURCHARGE_THEN_FUEL';

