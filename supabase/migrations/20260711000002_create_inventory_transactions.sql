-- Create inventory_transactions table for external inventory API sync
-- This table stores stock-in/stock-out transaction records from the external API

CREATE TABLE IF NOT EXISTS "public"."inventory_transactions" (
  "id" integer NOT NULL,
  "username" text,
  "name" text,
  "branch" text,
  "ref_no" text,
  "party_name" text,
  "vehical_no" text,
  "category" text,
  "material_detail" text NOT NULL,
  "unit" text,
  "recieved_qty" numeric DEFAULT 0,
  "rate" numeric DEFAULT 0,
  "amount" text DEFAULT '0.00',
  "consumption" numeric DEFAULT 0,
  "remarks" text,
  "created_at" timestamp with time zone,
  "bsdate" text,
  "dbdate" text,
  "vat_percent" integer DEFAULT 0,
  "vat_amount" text DEFAULT '0.00',
  "total_amount" text DEFAULT '0.00',
  "location" text,
  "synced_at" timestamp with time zone DEFAULT now(),
  "source_url" text,
  CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_inventory_transactions_material" ON "public"."inventory_transactions" ("material_detail");
CREATE INDEX IF NOT EXISTS "idx_inventory_transactions_category" ON "public"."inventory_transactions" ("category");
CREATE INDEX IF NOT EXISTS "idx_inventory_transactions_created_at" ON "public"."inventory_transactions" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_inventory_transactions_party" ON "public"."inventory_transactions" ("party_name");
CREATE INDEX IF NOT EXISTS "idx_inventory_transactions_location" ON "public"."inventory_transactions" ("location");

-- Enable Row Level Security
ALTER TABLE "public"."inventory_transactions" ENABLE ROW LEVEL SECURITY;

-- Allow all reads for authenticated and anon users
CREATE POLICY "allow_all_read_inventory_transactions" ON "public"."inventory_transactions" FOR SELECT TO "anon", "authenticated", "service_role" USING (true);

-- Allow service_role to do everything (for sync endpoint)
CREATE POLICY "allow_all_insert_inventory_transactions" ON "public"."inventory_transactions" FOR INSERT TO "anon", "authenticated", "service_role" WITH CHECK (true);
CREATE POLICY "allow_all_update_inventory_transactions" ON "public"."inventory_transactions" FOR UPDATE TO "anon", "authenticated", "service_role" USING (true);
CREATE POLICY "allow_all_delete_inventory_transactions" ON "public"."inventory_transactions" FOR DELETE TO "authenticated", "service_role" USING (true);

-- Grant service_role full access
GRANT ALL ON "public"."inventory_transactions" TO "service_role";

-- Comments
COMMENT ON TABLE "public"."inventory_transactions" IS 'Inventory stock-in/stock-out transactions synced from external inventory API';
COMMENT ON COLUMN "public"."inventory_transactions"."recieved_qty" IS 'Stock received quantity (stock in)';
COMMENT ON COLUMN "public"."inventory_transactions"."consumption" IS 'Stock consumed quantity (stock out)';
COMMENT ON COLUMN "public"."inventory_transactions"."synced_at" IS 'Timestamp of last sync from external API';