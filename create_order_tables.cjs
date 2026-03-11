require('dotenv').config();
const { Client } = require('pg');

async function createTables() {
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    try {
        await client.connect();
        console.log('Connected to Supabase.');

        const queries = [
            `CREATE TABLE IF NOT EXISTS public."CustomerOrder" (
                "id" text PRIMARY KEY,
                "customerId" text NOT NULL,
                "customerName" text,
                "orderNumber" text,
                "date" text,
                "productType" text,
                "quantity" double precision,
                "pricePerKg" double precision,
                "colorCount" double precision,
                "clicheWidth" double precision,
                "clicheHeight" double precision,
                "printingCostPerKg" double precision,
                "cuttingCostPerKg" double precision,
                "notes" text,
                "status" text DEFAULT 'OPEN',
                "createdAt" text
            );`,

            `CREATE TABLE IF NOT EXISTS public."CustomerPayment" (
                "id" text PRIMARY KEY,
                "customerId" text NOT NULL,
                "amount" double precision,
                "date" text,
                "note" text,
                "createdAt" text
            );`,

            `ALTER TABLE public."CustomerOrder" ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE public."CustomerPayment" ENABLE ROW LEVEL SECURITY;`,

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
            $pol$;`
        ];

        for (const query of queries) {
            try {
                await client.query(query);
                console.log('✅ Done:', query.trim().substring(0, 60) + '...');
            } catch (err) {
                console.error('❌ Failed:', query.trim().substring(0, 60), '\n  Reason:', err.message);
            }
        }
        console.log('\nAll done!');
    } catch (err) {
        console.error('Connection error:', err.stack);
    } finally {
        await client.end();
    }
}

createTables();
