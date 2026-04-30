import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqiefmheajfllzominuf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxaWVmbWhlYWpmbGx6b21pbnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjQwOTIsImV4cCI6MjA4ODQwMDA5Mn0.jOsJIwaJRqD9b0LlOdbgpH9df0Qs1zbPtNX2fgpzEk0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Fetching all supplies...");
    const supplies = await supabase.from('SupplierSupply').select('*');
    console.log("Supplies:", supplies.data ? supplies.data.length : supplies.error);
    
    if (supplies.error) {
        console.error("Supplies error:", supplies.error);
    }
    
    if (supplies.data && supplies.data.length > 0) {
        console.log("Sample supply:", supplies.data[0]);
    }

    console.log("Fetching supplies with type=RAW...");
    const rawSupplies = await supabase.from('SupplierSupply').select('*').or('type.eq.RAW,type.is.null');
    console.log("Raw Supplies:", rawSupplies.data ? rawSupplies.data.length : rawSupplies.error);
}

test();
