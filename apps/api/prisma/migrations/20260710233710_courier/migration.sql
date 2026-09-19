-- CreateEnum
CREATE TYPE "CourierSurchargeType" AS ENUM ('FUEL_PCT', 'REMOTE_AREA', 'OTHER');

-- CreateTable
CREATE TABLE "courier_contracts" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "direction" "ShipmentDirection" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "valid_from" DATE,
    "valid_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_rate_slabs" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "destination_zone" TEXT NOT NULL,
    "weight_from_kg" DECIMAL(12,3) NOT NULL,
    "weight_to_kg" DECIMAL(12,3) NOT NULL,
    "rate_per_kg" DECIMAL(14,4),
    "flat_rate" DECIMAL(14,2),
    "min_charge" DECIMAL(14,2),

    CONSTRAINT "courier_rate_slabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_surcharges" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "type" "CourierSurchargeType" NOT NULL,
    "label" TEXT NOT NULL,
    "value" DECIMAL(14,4) NOT NULL,
    "is_percentage" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "courier_surcharges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_transit" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "destination_zone" TEXT NOT NULL,
    "transit_days" INTEGER NOT NULL,

    CONSTRAINT "courier_transit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_rate_slabs_contract_id_destination_zone_idx" ON "courier_rate_slabs"("contract_id", "destination_zone");

-- AddForeignKey
ALTER TABLE "courier_contracts" ADD CONSTRAINT "courier_contracts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_rate_slabs" ADD CONSTRAINT "courier_rate_slabs_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "courier_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_surcharges" ADD CONSTRAINT "courier_surcharges_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "courier_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_transit" ADD CONSTRAINT "courier_transit_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "courier_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

