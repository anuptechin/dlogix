-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LOGISTICS', 'DOCUMENTATION', 'MANAGEMENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ShipmentDirection" AS ENUM ('EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "ShipmentMode" AS ENUM ('AIR', 'LCL', 'FCL', 'COURIER');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('DRAFT', 'SENT', 'QUOTING', 'COMPARED', 'AWARDED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'DRAFT', 'SUBMITTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EnquiryVendorStatus" AS ENUM ('INVITED', 'OPENED', 'RESPONDED', 'DECLINED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('WON', 'LOST', 'GENERIC');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "entra_object_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'LOGISTICS',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "mode_capabilities" "ShipmentMode"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ports_locations" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "country" TEXT,

    CONSTRAINT "ports_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "applies_to_mode" "ShipmentMode"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "charge_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "enquiry_no" TEXT NOT NULL,
    "direction" "ShipmentDirection" NOT NULL,
    "mode" "ShipmentMode" NOT NULL,
    "origin_id" TEXT,
    "destination_id" TEXT,
    "cargo_desc" TEXT,
    "weight_kg" DECIMAL(12,3),
    "volume_cbm" DECIMAL(12,3),
    "chargeable_weight" DECIMAL(12,3),
    "incoterm" TEXT,
    "target_date" DATE,
    "quote_deadline" TIMESTAMP(3),
    "status" "EnquiryStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_vendors" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "invite_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "status" "EnquiryVendorStatus" NOT NULL DEFAULT 'INVITED',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "enquiry_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "enquiry_vendor_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "valid_until" DATE,
    "transit_time_days" INTEGER,
    "remarks" TEXT,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_lines" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "charge_type_id" TEXT,
    "description" TEXT,
    "unit" TEXT,
    "qty" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "rate" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "quotation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "awarded_by" TEXT NOT NULL,
    "awarded_amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_feedback" (
    "id" TEXT NOT NULL,
    "enquiry_vendor_id" TEXT NOT NULL,
    "feedback_type" "FeedbackType" NOT NULL,
    "message" TEXT,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "vendor_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_history" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT,
    "direction" "ShipmentDirection",
    "mode" "ShipmentMode",
    "origin_id" TEXT,
    "destination_id" TEXT,
    "vendor_id" TEXT,
    "amount" DECIMAL(14,2),
    "currency" TEXT,
    "awarded_at" TIMESTAMP(3),

    CONSTRAINT "shipment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_entra_object_id_key" ON "users"("entra_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "enquiries_enquiry_no_key" ON "enquiries"("enquiry_no");

-- CreateIndex
CREATE UNIQUE INDEX "enquiry_vendors_invite_token_key" ON "enquiry_vendors"("invite_token");

-- CreateIndex
CREATE UNIQUE INDEX "enquiry_vendors_enquiry_id_vendor_id_key" ON "enquiry_vendors"("enquiry_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_enquiry_vendor_id_key" ON "quotations"("enquiry_vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "awards_enquiry_id_key" ON "awards"("enquiry_id");

-- CreateIndex
CREATE INDEX "shipment_history_direction_mode_origin_id_destination_id_idx" ON "shipment_history"("direction", "mode", "origin_id", "destination_id");

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "ports_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "ports_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_vendors" ADD CONSTRAINT "enquiry_vendors_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_vendors" ADD CONSTRAINT "enquiry_vendors_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_enquiry_vendor_id_fkey" FOREIGN KEY ("enquiry_vendor_id") REFERENCES "enquiry_vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_charge_type_id_fkey" FOREIGN KEY ("charge_type_id") REFERENCES "charge_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_awarded_by_fkey" FOREIGN KEY ("awarded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_feedback" ADD CONSTRAINT "vendor_feedback_enquiry_vendor_id_fkey" FOREIGN KEY ("enquiry_vendor_id") REFERENCES "enquiry_vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_history" ADD CONSTRAINT "shipment_history_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_history" ADD CONSTRAINT "shipment_history_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

