require('dotenv').config();
const { Client } = require('pg');

async function updateSchema() {
    const client = new Client({
        connectionString: process.env.DIRECT_URL
    });

    try {
        await client.connect();
        console.log('Connected to Supabase PostgreSQL database via direct URL.');

        const queries = [
            `ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS "supplyId" text;`,
            `ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS "notes" text;`,

            `ALTER TABLE public."Customer" ADD COLUMN IF NOT EXISTS "orders" integer;`,
            `ALTER TABLE public."Customer" ADD COLUMN IF NOT EXISTS "lastVisit" text;`,
            `ALTER TABLE public."Customer" ADD COLUMN IF NOT EXISTS "joinDate" text;`,
            `ALTER TABLE public."Customer" ADD COLUMN IF NOT EXISTS "status" text;`,
            `ALTER TABLE public."Customer" ADD COLUMN IF NOT EXISTS "totalSpent" double precision;`,

            `ALTER TABLE public."Supplier" ADD COLUMN IF NOT EXISTS "phone" text;`,
            `ALTER TABLE public."Supplier" ADD COLUMN IF NOT EXISTS "email" text;`,
            `ALTER TABLE public."Supplier" ADD COLUMN IF NOT EXISTS "address" text;`,

            `ALTER TABLE public."Sale" ADD COLUMN IF NOT EXISTS "profit" double precision;`,
            `ALTER TABLE public."Sale" ADD COLUMN IF NOT EXISTS "cashier" text;`,
            `ALTER TABLE public."Sale" ADD COLUMN IF NOT EXISTS "discountType" text;`,
            `ALTER TABLE public."Sale" ADD COLUMN IF NOT EXISTS "discountValue" double precision;`,
            `ALTER TABLE public."Sale" ADD COLUMN IF NOT EXISTS "subtotal" double precision;`,
            `ALTER TABLE public."Sale" ADD COLUMN IF NOT EXISTS "customer" jsonb;`,
            `ALTER TABLE public."Sale" ADD COLUMN IF NOT EXISTS "total" double precision;`,

            `ALTER TABLE public."Shift" ADD COLUMN IF NOT EXISTS "sales" jsonb;`,
            `ALTER TABLE public."Shift" ADD COLUMN IF NOT EXISTS "notes" text;`,
            `ALTER TABLE public."Shift" ADD COLUMN IF NOT EXISTS "expenses" jsonb;`,
            `ALTER TABLE public."Shift" ADD COLUMN IF NOT EXISTS "differences" double precision;`,

            `ALTER TABLE public."Expense" ADD COLUMN IF NOT EXISTS "shiftId" text;`,
            `ALTER TABLE public."Expense" ADD COLUMN IF NOT EXISTS "user" text;`,

            `ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "name" text;`,
            `ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "status" text;`,
            `ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "createdAt" text;`,
            `ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "lastLogin" text;`
        ];

        for (const query of queries) {
            try {
                await client.query(query);
                console.log('Executed:', query);
            } catch (err) {
                console.error(`Failed to execute query: ${query}`, err.message);
            }
        }
        console.log('Schema update complete.');
    } catch (err) {
        console.error('Connection error', err.stack);
    } finally {
        await client.end();
    }
}

updateSchema();
