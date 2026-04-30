import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqiefmheajfllzominuf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxaWVmbWhlYWpmbGx6b21pbnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjQwOTIsImV4cCI6MjA4ODQwMDA5Mn0.jOsJIwaJRqD9b0LlOdbgpH9df0Qs1zbPtNX2fgpzEk0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const todayStr = '2026-04-30';
    const { data: rawSupplies } = await supabase.from('SupplierSupply').select('*').or('type.eq.RAW,type.is.null').eq('date', todayStr);
    const { data: rawSuppliers } = await supabase.from('Supplier').select('id, name');
    
    console.log("Valid Supplier IDs in DB:", rawSuppliers.map(s => s.id));
    
    rawSupplies.forEach(s => {
        const isValid = rawSuppliers.find(sup => sup.id === s.supplierId);
        console.log(`Supply ${s.productName} (${s.quantity}) with supplierId ${s.supplierId} - Valid in DB? ${!!isValid}`);
    });
}

test();
