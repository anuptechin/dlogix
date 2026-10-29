-- Track when the invite email actually went out, so re-sending only emails new vendors.
ALTER TABLE "enquiry_vendors" ADD COLUMN "invite_sent_at" TIMESTAMP(3);
