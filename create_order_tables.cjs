require('dotenv').config();
const { Client } = require('pg');

async function createTables() {
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    try {
        await client.connect();
        console.log('Connected to Supabase.');

        const queries = [
            // ─── Customer Table: Full Schema ───
            `CREATE TABLE IF NOT EXISTS public."Customer" (
                "id" text PRIMARY KEY,
                "name" text NOT NULL,
                "phone" text,
                "email" text,
                "address" text,
                "status" text DEFAULT 'جديد',
                "points" integer DEFAULT 0,
                "totalPurchases" double precision DEFAULT 0,
                "totalSpent" double precision DEFAULT 0,
                "orders" integer DEFAULT 0,
                "lastVisit" text,
                "joinDate" text,
                "createdAt" text,
                "businessActivity" text,
                "usualProduct" text,
                "cliche" text,
                "clicheWidth" text,
                "clicheHeight" text,
                "colorCount" text,
                "notes" text,
                "sizeWidth" text,
                "sizeHeight" text,
                "bagSizes" JSONB,
                "profileCliches" JSONB,
                "profileSizes" JSONB
            );`,

            // ─── CustomerOrder Table: Full Schema ───
            `CREATE TABLE IF NOT EXISTS public."CustomerOrder" (
                "id" text PRIMARY KEY,
                "customerId" text NOT NULL,
                "customerName" text,
                "orderNumber" text,
                "date" text,
                "productType" text,
                "quantity" double precision DEFAULT 0,
                "pricePerKg" double precision DEFAULT 0,
                "colorCount" double precision DEFAULT 0,
                "clicheWidth" double precision DEFAULT 0,
                "clicheHeight" double precision DEFAULT 0,
                "printingCostPerKg" double precision DEFAULT 0,
                "cuttingCostPerKg" double precision DEFAULT 0,
                "notes" text,
                "status" text DEFAULT 'OPEN',
                "clicheEnabled" boolean DEFAULT false,
                "clicheCost" double precision DEFAULT 0,
                "color" text,
                "size" text,
                "sizes" JSONB,
                "bottomEnabled" boolean DEFAULT false,
                "bottomSize" text,
                "thickness" text,
                "deliveryDate" text,
                "reminderDate" text,
                "profitMargin" double precision DEFAULT 0,
                "sizeWidth" text,
                "sizeHeight" text,
                "createdAt" text
            );`,

            // ─── CustomerPayment Table ───
            `CREATE TABLE IF NOT EXISTS public."CustomerPayment" (
                "id" text PRIMARY KEY,
                "customerId" text NOT NULL,
                "amount" double precision DEFAULT 0,
                "date" text,
                "note" text,
                "createdAt" text
            );`,

            // ─── RLS Policies ───
            `ALTER TABLE public."Customer" ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE public."CustomerOrder" ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE public."CustomerPayment" ENABLE ROW LEVEL SECURITY;`,

            `DO $pol$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Customer' AND policyname = 'Allow all') THEN
                    CREATE POLICY "Allow all" ON public."Customer" FOR ALL USING (true) WITH CHECK (true);
                END IF;
            END
            $pol$;`,

            `DO $pol$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'CustomerOrder' AND policyname = 'Allow all') THEN
                    CREATE POLICY "Allow all" ON public."CustomerOrder" FOR ALL USING (true) WITH CHECK (true);
                END IF;
            END
            $pol$;`,

            `DO $pol$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'CustomerPayment' AND policyname = 'Allow all') THEN
                    CREATE POLICY "Allow all" ON public."CustomerPayment" FOR ALL USING (true) WITH CHECK (true);
                END IF;
            END
            $pol$;`,

            // ─── Add missing columns to existing tables (idempotent) ───
            `ALTER TABLE public."Customer"
              ADD COLUMN IF NOT EXISTS "bagSizes" JSONB,
              ADD COLUMN IF NOT EXISTS "profileCliches" JSONB,
              ADD COLUMN IF NOT EXISTS "profileSizes" JSONB,
              ADD COLUMN IF NOT EXISTS "sizeWidth" text,
              ADD COLUMN IF NOT EXISTS "sizeHeight" text,
              ADD COLUMN IF NOT EXISTS "clicheWidth" text,
              ADD COLUMN IF NOT EXISTS "clicheHeight" text,
              ADD COLUMN IF NOT EXISTS "colorCount" text,
              ADD COLUMN IF NOT EXISTS "businessActivity" text,
              ADD COLUMN IF NOT EXISTS "usualProduct" text,
              ADD COLUMN IF NOT EXISTS "cliche" text,
              ADD COLUMN IF NOT EXISTS "notes" text;`,

            `ALTER TABLE public."CustomerOrder"
              ADD COLUMN IF NOT EXISTS "clicheEnabled" boolean DEFAULT false,
              ADD COLUMN IF NOT EXISTS "clicheCost" double precision DEFAULT 0,
              ADD COLUMN IF NOT EXISTS "color" text,
              ADD COLUMN IF NOT EXISTS "size" text,
              ADD COLUMN IF NOT EXISTS "sizes" JSONB,
              ADD COLUMN IF NOT EXISTS "bottomEnabled" boolean DEFAULT false,
              ADD COLUMN IF NOT EXISTS "bottomSize" text,
              ADD COLUMN IF NOT EXISTS "thickness" text,
              ADD COLUMN IF NOT EXISTS "deliveryDate" text,
              ADD COLUMN IF NOT EXISTS "reminderDate" text,
              ADD COLUMN IF NOT EXISTS "profitMargin" double precision DEFAULT 0,
              ADD COLUMN IF NOT EXISTS "sizeWidth" text,
              ADD COLUMN IF NOT EXISTS "sizeHeight" text;`
        ];

        for (const query of queries) {
            try {
                await client.query(query);
                console.log('✅ Done:', query.trim().substring(0, 80) + '...');
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log('⏭️  Skipped (already exists):', query.trim().substring(0, 60));
                } else {
                    console.error('❌ Failed:', query.trim().substring(0, 60), '\n  Reason:', err.message);
                }
            }
        }
        console.log('\n✅ All done! Database schema is up to date.');
    } catch (err) {
        console.error('Connection error:', err.stack);
    } finally {
        await client.end();
    }
}

createTables();
