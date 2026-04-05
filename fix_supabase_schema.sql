-- =============================================
-- FIX: Add missing columns to Supabase schema
-- Run this in Supabase SQL Editor
-- =============================================

-- ─── 1. Customer Table: Add JSONB columns ───
ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "bagSizes"       JSONB,
  ADD COLUMN IF NOT EXISTS "profileCliches" JSONB,
  ADD COLUMN IF NOT EXISTS "profileSizes"   JSONB,
  ADD COLUMN IF NOT EXISTS "sizeWidth"      text,
  ADD COLUMN IF NOT EXISTS "sizeHeight"     text,
  ADD COLUMN IF NOT EXISTS "clicheWidth"    text,
  ADD COLUMN IF NOT EXISTS "clicheHeight"   text,
  ADD COLUMN IF NOT EXISTS "colorCount"     text,
  ADD COLUMN IF NOT EXISTS "businessActivity" text,
  ADD COLUMN IF NOT EXISTS "usualProduct"   text,
  ADD COLUMN IF NOT EXISTS "cliche"         text,
  ADD COLUMN IF NOT EXISTS "notes"          text,
  ADD COLUMN IF NOT EXISTS "points"         integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalPurchases" double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalSpent"     double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "orders"         integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastVisit"      text,
  ADD COLUMN IF NOT EXISTS "joinDate"       text,
  ADD COLUMN IF NOT EXISTS "status"         text DEFAULT 'جديد',
  ADD COLUMN IF NOT EXISTS "address"        text,
  ADD COLUMN IF NOT EXISTS "email"          text;

-- ─── 2. CustomerOrder Table: Add all missing columns ───
ALTER TABLE "CustomerOrder"
  ADD COLUMN IF NOT EXISTS "clicheEnabled"      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "clicheCost"         double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "color"              text,
  ADD COLUMN IF NOT EXISTS "size"               text,
  ADD COLUMN IF NOT EXISTS "sizes"              JSONB,
  ADD COLUMN IF NOT EXISTS "bottomEnabled"      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bottomSize"         text,
  ADD COLUMN IF NOT EXISTS "thickness"          text,
  ADD COLUMN IF NOT EXISTS "deliveryDate"       text,
  ADD COLUMN IF NOT EXISTS "reminderDate"       text,
  ADD COLUMN IF NOT EXISTS "profitMargin"       double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sizeWidth"          text,
  ADD COLUMN IF NOT EXISTS "sizeHeight"         text;

-- ─── 3. Verify RLS Policies exist ───
-- Customer
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'Customer' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON "Customer" FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $pol$;

-- CustomerOrder
ALTER TABLE "CustomerOrder" ENABLE ROW LEVEL SECURITY;
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'CustomerOrder' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON "CustomerOrder" FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $pol$;

-- CustomerPayment
ALTER TABLE "CustomerPayment" ENABLE ROW LEVEL SECURITY;
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'CustomerPayment' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON "CustomerPayment" FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $pol$;

-- ─── Done ───
SELECT 'Schema fix completed successfully!' AS status;
