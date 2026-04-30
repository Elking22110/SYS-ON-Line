import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqiefmheajfllzominuf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxaWVmbWhlYWpmbGx6b21pbnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjQwOTIsImV4cCI6MjA4ODQwMDA5Mn0.jOsJIwaJRqD9b0LlOdbgpH9df0Qs1zbPtNX2fgpzEk0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Fetching today's supplies...");
    const todayStr = '2026-04-30'; // Today's date based on context
    
    const { data: rawSupplies, error: e1 } = await supabase.from('SupplierSupply').select('*').or('type.eq.RAW,type.is.null').eq('date', todayStr);
    const { data: inkSupplies, error: e2 } = await supabase.from('SupplierSupply').select('*').eq('type', 'INK').eq('date', todayStr);
    const { data: clicheSupplies, error: e3 } = await supabase.from('SupplierSupply').select('*').eq('type', 'CLICHE').eq('date', todayStr);
    
    console.log("RAW Today:", rawSupplies ? rawSupplies.map(s => ({ productName: s.productName, quantity: s.quantity, supplierId: s.supplierId })) : e1);
    console.log("INK Today:", inkSupplies ? inkSupplies.map(s => ({ productName: s.productName, quantity: s.quantity, supplierId: s.supplierId })) : e2);
    console.log("CLICHE Today:", clicheSupplies ? clicheSupplies.map(s => ({ productName: s.productName, quantity: s.quantity, supplierId: s.supplierId })) : e3);
    
    const totalRaw = (rawSupplies || []).reduce((sum, s) => sum + Number(s.quantity), 0);
    const totalInk = (inkSupplies || []).reduce((sum, s) => sum + Number(s.quantity), 0);
    const totalCliche = (clicheSupplies || []).reduce((sum, s) => sum + Number(s.quantity), 0);
    
    console.log(`Total Quantity RAW: ${totalRaw}`);
    console.log(`Total Quantity INK: ${totalInk}`);
    console.log(`Total Quantity CLICHE: ${totalCliche}`);
    console.log(`Grand Total Today: ${totalRaw + totalInk + totalCliche}`);
}

test();
