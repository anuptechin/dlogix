-- CreateEnum
CREATE TYPE "ChargeCategory" AS ENUM ('FREIGHT', 'ORIGIN', 'DESTINATION', 'LOCAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ShipmentPriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('SPOT', 'CONTRACT');

-- CreateEnum
CREATE TYPE "PartyRole" AS ENUM ('CUSTOMER', 'CONSIGNEE', 'SUPPLIER', 'BUYER');

-- AlterTable
ALTER TABLE "charge_types" ADD COLUMN     "category" "ChargeCategory" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "enquiries" ADD COLUMN     "branch_plant" TEXT,
ADD COLUMN     "business_unit" TEXT,
ADD COLUMN     "buyer_id" TEXT,
ADD COLUMN     "cargo_currency" TEXT,
ADD COLUMN     "cargo_value" DECIMAL(14,2),
ADD COLUMN     "commodity" TEXT,
ADD COLUMN     "consignee_id" TEXT,
ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "customer_po_no" TEXT,
ADD COLUMN     "delivery_address" TEXT,
ADD COLUMN     "direct_service_only" BOOLEAN,
ADD COLUMN     "eta_required" DATE,
ADD COLUMN     "etd_required" DATE,
ADD COLUMN     "factory_stuffing" BOOLEAN,
ADD COLUMN     "final_destination" TEXT,
ADD COLUMN     "hs_code" TEXT,
ADD COLUMN     "incoterm_details" JSONB,
ADD COLUMN     "internal_remarks" TEXT,
ADD COLUMN     "max_transit_days" INTEGER,
ADD COLUMN     "nature_of_cargo" TEXT,
ADD COLUMN     "net_weight_kg" DECIMAL(12,3),
ADD COLUMN     "origin_icd_cfs_id" TEXT,
ADD COLUMN     "package_count" INTEGER,
ADD COLUMN     "package_type" TEXT,
ADD COLUMN     "pickup_address" TEXT,
ADD COLUMN     "po_numbers" TEXT[],
ADD COLUMN     "preferred_shipping_line" TEXT,
ADD COLUMN     "preferred_vessel" TEXT,
ADD COLUMN     "priority" "ShipmentPriority",
ADD COLUMN     "quote_validity_date" DATE,
ADD COLUMN     "sailing_required_before" DATE,
ADD COLUMN     "sales_order_no" TEXT,
ADD COLUMN     "service_options" JSONB,
ADD COLUMN     "service_scope" TEXT,
ADD COLUMN     "special_instructions" TEXT,
ADD COLUMN     "stuffing_location" TEXT,
ADD COLUMN     "supplier_id" TEXT,
ADD COLUMN     "supplier_invoice_no" TEXT,
ADD COLUMN     "transshipment_allowed" BOOLEAN,
ADD COLUMN     "volumetric_weight" DECIMAL(12,3);

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "eta" DATE,
ADD COLUMN     "etd" DATE,
ADD COLUMN     "free_demurrage_dest_days" INTEGER,
ADD COLUMN     "free_detention_dest_days" INTEGER,
ADD COLUMN     "free_detention_origin_days" INTEGER,
ADD COLUMN     "rate_type" "RateType",
ADD COLUMN     "shipping_line" TEXT,
ADD COLUMN     "transshipments" INTEGER,
ADD COLUMN     "vessel_name" TEXT;

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "roles" "PartyRole"[],
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "country" TEXT,
    "city" TEXT,
    "preferred_airport_id" TEXT,
    "preferred_port_id" TEXT,
    "preferred_forwarder_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,

    CONSTRAINT "vendor_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lookup_options" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "meta" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lookup_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incoterms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shown_fields" JSONB,
    "responsibilities" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "incoterms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_dimensions" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "label" TEXT,
    "length_cm" DECIMAL(10,2) NOT NULL,
    "width_cm" DECIMAL(10,2) NOT NULL,
    "height_cm" DECIMAL(10,2) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "enquiry_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_containers" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "container_type" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "est_weight_kg" DECIMAL(12,3),

    CONSTRAINT "enquiry_containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_required_charges" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "charge_type_id" TEXT NOT NULL,

    CONSTRAINT "enquiry_required_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_documents" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "doc_type" TEXT,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_group_members_group_id_vendor_id_key" ON "vendor_group_members"("group_id", "vendor_id");

-- CreateIndex
CREATE INDEX "lookup_options_category_idx" ON "lookup_options"("category");

-- CreateIndex
CREATE UNIQUE INDEX "incoterms_code_key" ON "incoterms"("code");

-- CreateIndex
CREATE INDEX "enquiry_dimensions_enquiry_id_idx" ON "enquiry_dimensions"("enquiry_id");

-- CreateIndex
CREATE INDEX "enquiry_containers_enquiry_id_idx" ON "enquiry_containers"("enquiry_id");

-- CreateIndex
CREATE UNIQUE INDEX "enquiry_required_charges_enquiry_id_charge_type_id_key" ON "enquiry_required_charges"("enquiry_id", "charge_type_id");

-- CreateIndex
CREATE INDEX "enquiry_documents_enquiry_id_idx" ON "enquiry_documents"("enquiry_id");

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_origin_icd_cfs_id_fkey" FOREIGN KEY ("origin_icd_cfs_id") REFERENCES "ports_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_consignee_id_fkey" FOREIGN KEY ("consignee_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_group_members" ADD CONSTRAINT "vendor_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "vendor_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_group_members" ADD CONSTRAINT "vendor_group_members_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_dimensions" ADD CONSTRAINT "enquiry_dimensions_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_containers" ADD CONSTRAINT "enquiry_containers_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_required_charges" ADD CONSTRAINT "enquiry_required_charges_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_required_charges" ADD CONSTRAINT "enquiry_required_charges_charge_type_id_fkey" FOREIGN KEY ("charge_type_id") REFERENCES "charge_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_documents" ADD CONSTRAINT "enquiry_documents_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

