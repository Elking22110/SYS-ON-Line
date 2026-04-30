import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  ShoppingCart,
  Search,
  Bell,
  MoreVertical,
  Activity,
  FileText,
  ChevronDown,
  DollarSign,
  RefreshCw,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import soundManager from '../utils/soundManager.js';
import storageOptimizer from '../utils/storageOptimizer.js';
import { formatTimeOnly, getCurrentDate, getLocalDateString, formatDateTime } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import supabaseService from '../utils/supabaseService.js';
import { useAuth } from '../components/AuthProvider';
import { subscribe, EVENTS } from '../utils/observerManager';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    dailySupplyQty: 0,
    todayNetQuantity: 0
  });

  const [allTimeSales, setAllTimeSales] = useState([]);
  const [allTimeClosedOrders, setAllTimeClosedOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({ sales: 0, orders: 0, customers: 0, supplierDebts: 0, customerDebts: 0, expenses: 0, monthlyExpenses: 0, netQuantity: 0 });
  const [yesterdayStats, setYesterdayStats] = useState({ sales: 0, orders: 0, customers: 0 });
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString('ar-EG'));
  const [auditModal, setAuditModal] = useState({ isOpen: false, title: '', type: '', data: [] });

  const openAuditModal = (type) => {
    soundManager.play('openWindow');
    if (type === 'supplier_debts') {
      const rawSuppliers = storageOptimizer.get('suppliers', []) || [];
      const inkSuppliers = storageOptimizer.get('ink_suppliers', []) || [];
      const clicheSuppliers = storageOptimizer.get('cliche_suppliers', []) || [];
      const suppliers = [...rawSuppliers, ...inkSuppliers, ...clicheSuppliers];
      
      const rawSupplies = storageOptimizer.get('supplier_supplies', []) || [];
      const inkSupplies = storageOptimizer.get('ink_supplies', []) || [];
      const clicheSupplies = storageOptimizer.get('cliche_supplies', []) || [];
      const allSupplies = [...rawSupplies, ...inkSupplies, ...clicheSupplies];
      
      const rawPayments = storageOptimizer.get('supplier_payments', []) || [];
      const inkPayments = storageOptimizer.get('ink_payments', []) || [];
      const clichePayments = storageOptimizer.get('cliche_payments', []) || [];
      const allPayments = [...rawPayments, ...inkPayments, ...clichePayments];
      
      const supplierDebtMap = {};
      suppliers.forEach(s => supplierDebtMap[s.id] = { id: s.id, name: s.name, totalSupplies: 0, totalPayments: 0, netDebt: 0 });
      
      allSupplies.forEach(s => {
        if (supplierDebtMap[s.supplierId]) {
          supplierDebtMap[s.supplierId].totalSupplies += parseFloat(s.totalPrice) || 0;
          supplierDebtMap[s.supplierId].totalPayments += parseFloat(s.paidAmount) || 0;
        }
      });
      allPayments.forEach(p => {
        if (supplierDebtMap[p.supplierId]) {
          supplierDebtMap[p.supplierId].totalPayments += parseFloat(p.amount) || 0;
        }
      });
      
      const details = Object.values(supplierDebtMap).map(s => {
        s.netDebt = Math.max(0, s.totalSupplies - s.totalPayments);
        return s;
      }).filter(s => s.netDebt > 0).sort((a,b) => b.netDebt - a.netDebt);

      setAuditModal({ isOpen: true, title: 'تفاصيل ديون الموردين', type: 'supplier', data: details });
    } else if (type === 'customer_debts') {
      const customers = storageOptimizer.get('customers', []) || [];
      const allOrders = storageOptimizer.get('customer_orders', []) || [];
      const allPayments = storageOptimizer.get('customer_payments', []) || [];
      
      const customerDebtMap = {};
      customers.forEach(c => customerDebtMap[c.id] = { id: c.id, name: c.name, totalOrders: 0, totalPayments: 0, netDebt: 0 });
      
      allOrders.forEach(o => {
        if (customerDebtMap[o.customerId] && o.status === 'CLOSED') {
          let orderTotal = 0;
          if (o.totalPrice !== undefined && o.totalPrice !== null) {
              orderTotal = parseFloat(o.totalPrice);
          } else {
              const q = parseFloat(o.quantity) || 0;
              const pricePerKg = parseFloat(o.pricePerKg) || 0;
              const printingCostPerKg = parseFloat(o.printingCostPerKg) || 0;
              const cuttingCostPerKg = parseFloat(o.cuttingCostPerKg) || 0;
              const profitMargin = parseFloat(o.profitMargin) || 0;
              const clicheCost = o.clicheEnabled ? (parseFloat(o.clicheCost) || 0) : 0;

              const totalPricePerKg = safeMath.add(
                  safeMath.add(pricePerKg, printingCostPerKg),
                  safeMath.add(cuttingCostPerKg, profitMargin)
              );

              const subtotal = safeMath.multiply(totalPricePerKg, q);
              orderTotal = safeMath.add(subtotal, clicheCost);
          }
          
          customerDebtMap[o.customerId].totalOrders = safeMath.add(customerDebtMap[o.customerId].totalOrders, orderTotal);
        }
      });
      allPayments.forEach(p => {
        if (customerDebtMap[p.customerId]) {
          customerDebtMap[p.customerId].totalPayments = safeMath.add(customerDebtMap[p.customerId].totalPayments, parseFloat(p.amount) || 0);
        }
      });
      
      const details = Object.values(customerDebtMap).map(c => {
        c.netDebt = Math.max(0, safeMath.subtract(c.totalOrders, c.totalPayments));
        return c;
      }).filter(c => c.netDebt > 0).sort((a,b) => b.netDebt - a.netDebt);

      setAuditModal({ isOpen: true, title: 'تفاصيل مستحقات العملاء', type: 'customer', data: details });
    }
  };

  // Build chart data from real sales — group by last 7 days
  const chartData = useMemo(() => {
    if ((!allTimeSales || allTimeSales.length === 0) && (!allTimeClosedOrders || allTimeClosedOrders.length === 0)) return [];

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    return days.map(day => {
      const daySales = allTimeSales.filter(s => {
        const saleDate = (s.date || s.createdAt || '').split('T')[0];
        return saleDate === day;
      });
      const dayOrders = allTimeClosedOrders.filter(o => {
        const orderDate = (o.closedAt || o.updatedAt || o.date || '').split('T')[0];
        return orderDate === day;
      });
      
      const posRevenue = daySales.reduce((sum, s) => sum + (parseFloat(s.total || s.totalAmount) || 0), 0);
      const ordersRevenue = dayOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0);
      
      const revenue = posRevenue + ordersRevenue;
      const ordersCount = daySales.length + dayOrders.length;
      
      const dayLabel = new Date(day).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' });
      return { day: dayLabel, revenue: Math.round(revenue), orders: ordersCount };
    });
  }, [allTimeSales, allTimeClosedOrders]);

  // Calculate percentage change
  const calcChange = (today, yesterday) => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const salesChange = calcChange(todayStats.sales, yesterdayStats.sales);
  const ordersChange = calcChange(todayStats.orders, yesterdayStats.orders);
  const customersChange = calcChange(todayStats.customers, yesterdayStats.customers);

  const analyzeRealData = () => {
    try {
      // 1. Core Data
      const posSales = storageOptimizer.get('sales', []) || [];
      const products = storageOptimizer.get('products', []) || [];
      const customers = storageOptimizer.get('customers', []) || [];
      
      // Suppliers Aggregation
      const rawSuppliers = storageOptimizer.get('suppliers', []) || [];
      const inkSuppliers = storageOptimizer.get('ink_suppliers', []) || [];
      const clicheSuppliers = storageOptimizer.get('cliche_suppliers', []) || [];
      const suppliers = [...rawSuppliers, ...inkSuppliers, ...clicheSuppliers];
      
      const customerOrders = storageOptimizer.get('customer_orders', []) || [];
      const customerPayments = storageOptimizer.get('customer_payments', []) || [];
      
      // Supplies Aggregation
      const rawSupplies = storageOptimizer.get('supplier_supplies', []) || [];
      const inkSupplies = storageOptimizer.get('ink_supplies', []) || [];
      const clicheSupplies = storageOptimizer.get('cliche_supplies', []) || [];
      const allSupplies = [...rawSupplies, ...inkSupplies, ...clicheSupplies];
      
      // Payments Aggregation
      const rawSupplierPayments = storageOptimizer.get('supplier_payments', []) || [];
      const inkSupplierPayments = storageOptimizer.get('ink_payments', []) || [];
      const clicheSupplierPayments = storageOptimizer.get('cliche_payments', []) || [];
      const allSupplierPayments = [...rawSupplierPayments, ...inkSupplierPayments, ...clicheSupplierPayments];

      setAllTimeSales(posSales);

      // Map IDs for strict filtering to avoid "Ghost Data" (Orphan records)
      const validCustomerIds = new Set(customers.map(c => String(c.id)));
      const validSupplierIds = new Set(suppliers.map(s => String(s.id)));
      
      const allClosedOrders = customerOrders.filter(o => o.status === 'CLOSED' && validCustomerIds.has(String(o.customerId)));
      setAllTimeClosedOrders(allClosedOrders);

      // 2. Dates
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // 3. Today's POS Sales
      const todayPOSSales = posSales.filter(s => (s.date || s.createdAt || '').split('T')[0] === today);
      const yesterdayPOSSales = posSales.filter(s => (s.date || s.createdAt || '').split('T')[0] === yesterday);

      // 4. Today's Customer Orders (Advanced) - Only count CLOSED ones as Sales
      const todayCLOSEDOrders = customerOrders.filter(o => 
        (o.closedAt || o.date || '').split('T')[0] === today && 
        o.status === 'CLOSED' &&
        validCustomerIds.has(String(o.customerId))
      );

      const yesterdayCLOSEDOrders = customerOrders.filter(o => 
        (o.closedAt || o.date || '').split('T')[0] === yesterday && 
        o.status === 'CLOSED' &&
        validCustomerIds.has(String(o.customerId))
      );

      // 5. Revenue Calculation (POS Sales + Customer Payments)
      const todayPOSRevenue = todayPOSSales.reduce((sum, s) => safeMath.add(sum, parseFloat(s.total || s.totalAmount) || 0), 0);
      const yesterdayPOSRevenue = yesterdayPOSSales.reduce((sum, s) => safeMath.add(sum, parseFloat(s.total || s.totalAmount) || 0), 0);
      
      const todayCustomerPaymentsTotal = customerPayments
         .filter(p => (p.date || '').split('T')[0] === today && validCustomerIds.has(String(p.customerId)))
         .reduce((sum, p) => safeMath.add(sum, parseFloat(p.amount) || 0), 0);
         
      const yesterdayCustomerPaymentsTotal = customerPayments
         .filter(p => (p.date || '').split('T')[0] === yesterday && validCustomerIds.has(String(p.customerId)))
         .reduce((sum, p) => safeMath.add(sum, parseFloat(p.amount) || 0), 0);

      // Value of Closed Orders Today
      const todayFactoryRevenue = todayCLOSEDOrders.reduce((sum, o) => safeMath.add(sum, parseFloat(o.totalPrice) || 0), 0);
      const yesterdayFactoryRevenue = yesterdayCLOSEDOrders.reduce((sum, o) => safeMath.add(sum, parseFloat(o.totalPrice) || 0), 0);

      const totalTodayRevenue = safeMath.add(todayPOSRevenue, todayFactoryRevenue);
      const totalYesterdayRevenue = safeMath.add(yesterdayPOSRevenue, yesterdayFactoryRevenue);

      // 6. Supplier Debt Calculation (Filter by valid supplier IDs only)
      const validSupplies = allSupplies.filter(s => validSupplierIds.has(String(s.supplierId)));
      
      const totalSuppliesValue = validSupplies.reduce((sum, s) => sum + (parseFloat(s.totalPrice) || 0), 0);
      
      const totalPaidInSupplies = validSupplies.reduce((sum, s) => sum + (parseFloat(s.paidAmount) || 0), 0);
      
      const totalSupplierPaymentsValue = allSupplierPayments
        .filter(p => validSupplierIds.has(String(p.supplierId)))
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      const totalSupplierDebt = Math.max(0, safeMath.subtract(totalSuppliesValue, safeMath.add(totalSupplierPaymentsValue, totalPaidInSupplies)));

      // 7. Customer Debt Calculation - Only Closed Orders count as debt
      // 7. Customer Debt Calculation - Calculate per customer to handle credits correctly
      const customerBalances = {};
      customers.forEach(c => customerBalances[c.id] = { orders: 0, payments: 0 });

      customerOrders
        .filter(o => o.status === 'CLOSED' && customerBalances[o.customerId])
        .forEach(o => {
          let orderTotal = 0;
          if (o.totalPrice !== undefined && o.totalPrice !== null) {
              orderTotal = parseFloat(o.totalPrice);
          } else {
              const q = parseFloat(o.quantity) || 0;
              const pricePerKg = parseFloat(o.pricePerKg) || 0;
              const printingCostPerKg = parseFloat(o.printingCostPerKg) || 0;
              const cuttingCostPerKg = parseFloat(o.cuttingCostPerKg) || 0;
              const profitMargin = parseFloat(o.profitMargin) || 0;
              const clicheCost = o.clicheEnabled ? (parseFloat(o.clicheCost) || 0) : 0;

              const totalPricePerKg = safeMath.add(
                  safeMath.add(pricePerKg, printingCostPerKg),
                  safeMath.add(cuttingCostPerKg, profitMargin)
              );

              const subtotal = safeMath.multiply(totalPricePerKg, q);
              orderTotal = safeMath.add(subtotal, clicheCost);
          }
          
          customerBalances[o.customerId].orders = safeMath.add(customerBalances[o.customerId].orders, orderTotal);
        });

      customerPayments
        .filter(p => customerBalances[p.customerId])
        .forEach(p => {
          customerBalances[p.customerId].payments = safeMath.add(customerBalances[p.customerId].payments, parseFloat(p.amount) || 0);
        });

      const totalCustomerDebt = Object.values(customerBalances).reduce((sum, bal) => {
        const debt = Math.max(0, safeMath.subtract(bal.orders, bal.payments));
        return safeMath.add(sum, debt);
      }, 0);

      // 8. Daily, Monthly and Shift Expenses Calculation
      const activeShiftForExpenses = storageOptimizer.get('activeShift', null);
      const allExpenses = storageOptimizer.get('expenses', []) || [];
      const currentMonth = today.slice(0, 7); // e.g. "2023-10"

      const todayExpenses = allExpenses.filter(e => String(e.date).split('T')[0] === today).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const monthlyExpenses = allExpenses.filter(e => String(e.date).startsWith(currentMonth)).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
      let shiftExpenses = 0;
      if (activeShiftForExpenses && activeShiftForExpenses.id) {
          shiftExpenses = allExpenses.filter(e => 
             e.shiftId === activeShiftForExpenses.id || (!e.shiftId && String(e.date).split('T')[0] === today)
          ).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      }

      // 9. Update Today's Summary (POS + Advanced Orders)
      setTodayStats({
        sales: totalTodayRevenue,
        orders: todayPOSSales.length + todayCLOSEDOrders.length,
        customers: customers.length,
        supplierDebts: totalSupplierDebt,
        customerDebts: totalCustomerDebt,
        expenses: todayExpenses,
        monthlyExpenses: monthlyExpenses,
        shiftExpenses: shiftExpenses,
        netQuantity: todayCLOSEDOrders.reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0)
      });

      setYesterdayStats({ 
        sales: totalYesterdayRevenue, 
        orders: yesterdayPOSSales.length + yesterdayCLOSEDOrders.length, 
        customers: Math.max(customers.length - 1, 0) 
      });

      // 9. Active Shift Stats
      const activeShift = storageOptimizer.get('activeShift', null);
      let shiftSales = posSales;
      let shiftClosedOrders = [];
      let shiftCustomerPayments = [];
      if (activeShift && activeShift.id) {
        shiftSales = posSales.filter(s => s.shiftId === activeShift.id);
        shiftClosedOrders = customerOrders.filter(o => o.status === 'CLOSED' && o.shiftId === activeShift.id);
        shiftCustomerPayments = customerPayments.filter(p => p.shiftId === activeShift.id);
      }

      // مبيعات الوردية = مبيعات POS + قيمة طلبات المصنع المغلقة (totalPrice)
      // تحصيلات المديونية (customer payments) لا تُحسب ضمن المبيعات — هي استرداد لدَيْن قائم
      const totalSales = safeMath.add(
        shiftSales.reduce((sum, sale) => safeMath.add(sum, sale.total || sale.totalAmount || 0), 0),
        shiftClosedOrders.reduce((sum, o) => safeMath.add(sum, parseFloat(o.totalPrice) || 0), 0)
      );
      // عدد الطلبات = POS فقط + طلبات المصنع المغلقة — التحصيل النقدي ليس طلباً
      const totalOrdersCount = shiftSales.length + shiftClosedOrders.length;

      // Combine and format recent sales & custom orders
      const combinedRecent = [
        ...shiftSales.map(sale => ({
          id: sale.id,
          type: 'pos',
          customer: sale.customer?.name || sale.customerName || sale.customerInfo?.name || (typeof sale.customer === 'string' ? sale.customer : 'نقدي'),
          amount: parseFloat(sale.total || sale.totalAmount) || 0,
          time: formatTimeOnly(sale.date || sale.createdAt),
          items: sale.items?.length || (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]').length : 0),
          paymentMethod: sale.paymentMethod || 'cash',
          date: new Date(sale.date || sale.createdAt)
        })),
        ...shiftClosedOrders.map(o => ({
          id: o.id,
          type: 'factory',
          customer: o.customerName || 'عميل مصنع',
          amount: parseFloat(o.totalPrice) || 0,
          time: formatTimeOnly(o.closedAt || o.updatedAt || o.date || new Date()),
          items: 1, // factory order is technically 1 big item
          paymentMethod: 'invoice',
          date: new Date(o.closedAt || o.updatedAt || o.date || new Date())
        })),
        ...shiftCustomerPayments.map(p => ({
          id: p.id,
          type: 'payment',
          customer: p.customerName || 'تحصيل مديونية',
          amount: parseFloat(p.amount) || 0,
          time: formatTimeOnly(p.date || new Date()),
          items: 0,
          paymentMethod: p.method || 'cash',
          date: new Date(p.date || new Date())
        }))
      ];

      const recent = combinedRecent
        .sort((a, b) => b.date - a.date)
        .slice(0, 5);

      // Distribution Calculation
      const dailySupplyQty = allSupplies
        .filter(s => (s.date || '').split('T')[0] === today && validSupplierIds.has(String(s.supplierId)))
        .reduce((sum, s) => safeMath.add(sum, parseFloat(s.quantity) || 0), 0);

      const totalStockValue = products.reduce((sum, p) => {
        const price = parseFloat(p.price) || 0;
        const stock = parseFloat(p.stock) || 0;
        return safeMath.add(sum, safeMath.multiply(price, stock));
      }, 0);

      setStats({
        totalSales,
        totalOrders: totalOrdersCount,
        totalCustomers: customers.length,
        totalProducts: products.length,
        dailySupplyQty: dailySupplyQty,
        totalStockValue: totalStockValue,
        totalSupplierDebt,
        totalCustomerDebt,
        todayNetQuantity: todayCLOSEDOrders.reduce((sum, o) => safeMath.add(sum, parseFloat(o.quantity) || 0), 0)
      });

      setRecentOrders(recent);
      setLastSync(new Date().toLocaleTimeString('ar-EG'));
    } catch (error) {
      console.error('Data analysis error:', error);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    soundManager.play('refresh');
    analyzeRealData(); // Load local instantly
    await syncWithSupabase();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const syncWithSupabase = async () => {
    try {
      const [products, customers, sales, categories] = await Promise.all([
        supabaseService.getProducts(),
        supabaseService.getCustomers(),
        supabaseService.getSales(),
        supabaseService.getCategories()
      ]);

      if (products && products.length > 0) {
        const mappedProducts = products.map(p => ({
          id: p.id, name: p.name, category: p.category, price: p.price,
          stock: p.quantity, minStock: p.minQuantity, barcode: p.barcode,
          image: p.image, supplyId: p.supplyId, isSupplyProduct: p.supplyId ? true : false,
          costPrice: p.costPrice
        }));
        localStorage.setItem('products', JSON.stringify(mappedProducts));
      } else {
        const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
        if (localProducts.length > 0 && navigator.onLine) {
          for (const p of localProducts) await supabaseService.addProduct(p).catch(() => { });
        }
      }

      if (customers && customers.length > 0) {
        localStorage.setItem('customers', JSON.stringify(customers));
      }

      if (sales && sales.length > 0) {
        localStorage.setItem('sales', JSON.stringify(sales));
      }

      if (categories && categories.length > 0) {
        let finalCategories = [...categories];
        if (!finalCategories.some(c => c.name === 'خامات توريد')) {
          finalCategories.push({ id: 'خامات توريد', name: 'خامات توريد', description: 'مواد خام مرتبطة بالتوريدات' });
          if (navigator.onLine) supabaseService.addCategory('خامات توريد', 'مواد خام مرتبطة بالتوريدات').catch(() => { });
        }
        localStorage.setItem('productCategories', JSON.stringify(finalCategories));
      } else {
        // إذا كانت الفئات فارغة في السحابة لكن موجودة محلياً (هجرة البيانات)
        const localCategories = JSON.parse(localStorage.getItem('productCategories') || '[]');
        if (localCategories.length > 0 && navigator.onLine) {
          console.log('Migrating local categories to cloud from Dashboard...');
          for (const cat of localCategories) {
            if (cat.name === 'الكل') continue;
            await supabaseService.addCategory(cat.name, cat.description || '').catch(() => { });
          }
        }
        if (!localCategories.some(c => c.name === 'خامات توريد')) {
          localCategories.push({ id: 'خامات توريد', name: 'خامات توريد', description: 'مواد خام مرتبطة بالتوريدات' });
          localStorage.setItem('productCategories', JSON.stringify(localCategories));
          if (navigator.onLine) supabaseService.addCategory('خامات توريد', 'مواد خام مرتبطة بالتوريدات').catch(() => { });
        }
      }

      // ─── SUPPLIER SYNC ───
      const [
        rawSups, inkSups, clicheSups,
        rawSupplies, inkSupplies, clicheSupplies,
        rawPayments, inkPayments, clichePayments
      ] = await Promise.all([
        supabaseService.getSuppliers('RAW'), supabaseService.getSuppliers('INK'), supabaseService.getSuppliers('CLICHE'),
        supabaseService.getAllSupplierSupplies('RAW'), supabaseService.getAllSupplierSupplies('INK'), supabaseService.getAllSupplierSupplies('CLICHE'),
        supabaseService.getAllSupplierPayments('RAW'), supabaseService.getAllSupplierPayments('INK'), supabaseService.getAllSupplierPayments('CLICHE')
      ]);

      if (rawSups?.length) localStorage.setItem('suppliers', JSON.stringify(rawSups));
      if (inkSups?.length) localStorage.setItem('ink_suppliers', JSON.stringify(inkSups));
      if (clicheSups?.length) localStorage.setItem('cliche_suppliers', JSON.stringify(clicheSups));

      if (rawSupplies?.length) localStorage.setItem('supplier_supplies', JSON.stringify(rawSupplies));
      if (inkSupplies?.length) localStorage.setItem('ink_supplies', JSON.stringify(inkSupplies));
      if (clicheSupplies?.length) localStorage.setItem('cliche_supplies', JSON.stringify(clicheSupplies));

      if (rawPayments?.length) localStorage.setItem('supplier_payments', JSON.stringify(rawPayments));
      if (inkPayments?.length) localStorage.setItem('ink_payments', JSON.stringify(inkPayments));
      if (clichePayments?.length) localStorage.setItem('cliche_payments', JSON.stringify(clichePayments));

      analyzeRealData();
    } catch (error) {
      console.error('Dashboard sync error:', error);
    }
  };

  useEffect(() => {
    analyzeRealData(); // Load local state instantly
    syncWithSupabase(); // Then sync in background
    const handleStorageChange = () => analyzeRealData();
    const interval = setInterval(analyzeRealData, 10000);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dataUpdated', handleStorageChange);

    const unsubProducts = typeof subscribe === 'function' ? subscribe(EVENTS.PRODUCTS_CHANGED, handleStorageChange) : null;
    const unsubCustomers = typeof subscribe === 'function' ? subscribe(EVENTS.CUSTOMERS_CHANGED, handleStorageChange) : null;
    const unsubSales = typeof subscribe === 'function' ? subscribe(EVENTS.INVOICES_CHANGED, handleStorageChange) : null;
    const unsubShifts = typeof subscribe === 'function' ? subscribe(EVENTS.SHIFTS_CHANGED, handleStorageChange) : null;
    const unsubSuppliers = typeof subscribe === 'function' ? subscribe(EVENTS.SUPPLIERS_CHANGED, handleStorageChange) : null;

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataUpdated', handleStorageChange);
      if (typeof unsubProducts === 'function') unsubProducts();
      if (typeof unsubCustomers === 'function') unsubCustomers();
      if (typeof unsubSales === 'function') unsubSales();
      if (typeof unsubShifts === 'function') unsubShifts();
      if (typeof unsubSuppliers === 'function') unsubSuppliers();
    };
  }, []);

  const userName = user?.name || user?.username || 'المدير';

  return (
    <div className="min-h-screen bg-[#F3F4F9] p-8 font-inter overflow-x-hidden relative">

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 w-full ">
        <div>
          <h1 className="text-3xl font-bold text-[#1e1b4b] tracking-tight">لوحة التحكم</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 text-sm">مرحباً {userName} 👋</p>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <p className="text-slate-400 text-[10px] font-bold flex items-center gap-1">
              <Clock className="w-3 h-3" /> تم التحديث: {lastSync}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          {/* Refresh Button */}
          <button
            onClick={refreshData}
            className={`flex items-center bg-[#F1EEFF] rounded-full px-4 py-2 text-sm text-[#7D6AE1] font-medium hover:bg-[#e5e0ff] transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gradient-to-tr from-purple-400 to-orange-300 flex items-center justify-center">
              <span className="text-white font-bold text-xs">{userName.charAt(0)}</span>
            </div>
            <div className="flex items-center text-[#1E1B4B]">
              <span className="text-sm font-semibold mr-1">{userName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- 5 STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6" style={{ overflow: 'visible' }}>

        {/* Card 0 - Net Delivered Today */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[24px] p-5 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group cursor-pointer hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all duration-300 border border-white/10 backdrop-blur-sm z-10">
          <div className="absolute top-4 right-4 flex items-center justify-center z-0 group-hover:scale-110 transition-transform duration-500">
            <span className="text-[3rem] md:text-[4rem] leading-none drop-shadow-[0_4px_20px_rgba(255,255,255,0.4)]">📈</span>
          </div>
          <div className="relative z-10">
            <p className="text-emerald-100 text-[10px] font-bold mb-1 tracking-wide uppercase">الصافي المسلم اليوم</p>
            <h3 className="text-3xl font-black mb-3 tracking-tight drop-shadow-sm">{(stats.todayNetQuantity || 0).toLocaleString()} <span className="text-xs font-bold text-emerald-200">كجم</span></h3>
            <div className="flex items-center text-[10px] font-semibold">
              <span className="flex items-center bg-black/20 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-sm">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-200" /> مبيعات محققة
              </span>
            </div>
          </div>
        </div>

        {/* Card 1 - Daily Supply Qty */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[28px] p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group cursor-pointer hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300 border border-white/10 backdrop-blur-sm z-10">
          <div className="absolute top-4 right-4 flex items-center justify-center z-0 group-hover:scale-110 transition-transform duration-500">
            <span className="text-[3.5rem] md:text-[5rem] leading-none drop-shadow-[0_4px_20px_rgba(255,255,255,0.4)]">🚚</span>
          </div>
          <div className="relative z-10">
            <p className="text-indigo-100 text-sm font-semibold mb-2 tracking-wide uppercase">توريدات اليوم</p>
            <h3 className="text-4xl font-black mb-4 tracking-tight drop-shadow-sm">{(stats.dailySupplyQty || 0).toLocaleString()} <span className="text-lg font-bold text-indigo-200">كجم</span></h3>
            <div className="flex items-center text-xs font-semibold">
              <span className="flex items-center bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                <Package className="w-3.5 h-3.5 mr-1 text-indigo-200" /> كمية التوريد
              </span>
            </div>
          </div>
        </div>

        {/* Card 2 - Total Sales Today */}
        <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-[28px] p-6 text-white shadow-xl shadow-fuchsia-500/20 relative overflow-hidden group cursor-pointer hover:shadow-fuchsia-500/40 hover:-translate-y-1 transition-all duration-300 border border-white/10 backdrop-blur-sm z-10">
          <div className="absolute top-4 right-4 flex items-center justify-center z-0 group-hover:scale-110 transition-transform duration-500" style={{ animationDelay: '0.5s' }}>
            <span className="text-[3.5rem] md:text-[5rem] leading-none drop-shadow-[0_4px_20px_rgba(255,255,255,0.4)]">💰</span>
          </div>
          <div className="relative z-10">
            <p className="text-fuchsia-100 text-sm font-semibold mb-2 tracking-wide uppercase">مبيعات الوردية</p>
            <h3 className="text-4xl font-black mb-4 tracking-tight drop-shadow-sm">{stats.totalSales.toLocaleString()} <span className="text-lg font-bold text-fuchsia-200">ج.م</span></h3>
            <div className="flex items-center text-xs font-semibold">
              {salesChange >= 0 ? (
                <span className="flex items-center bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full text-green-300 border border-green-400/20 shadow-sm">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" /> {salesChange > 0 ? `+${salesChange}%` : 'ثابت'}
                </span>
              ) : (
                <span className="flex items-center bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full text-red-300 border border-red-400/20 shadow-sm">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" /> {Math.abs(salesChange)}%
                </span>
              )}
              <span className="mr-2 text-white/70 font-medium">عن أمس</span>
            </div>
          </div>
        </div>

        {/* Card 3 - Total Orders */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[28px] p-5 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group cursor-pointer hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300 border border-white/10 backdrop-blur-sm z-10">
          <div className="absolute top-4 right-4 flex items-center justify-center z-0 group-hover:scale-110 transition-transform duration-500" style={{ animationDelay: '1s' }}>
            <span className="text-[3.5rem] md:text-[5rem] leading-none drop-shadow-[0_4px_20px_rgba(255,255,255,0.4)]">🛒</span>
          </div>
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-semibold mb-2 tracking-wide uppercase">عدد الطلبات</p>
            <h3 className="text-4xl font-black mb-4 tracking-tight drop-shadow-sm">{stats.totalOrders.toLocaleString()}</h3>
            <div className="flex items-center text-xs font-semibold">
              {ordersChange >= 0 ? (
                <span className="flex items-center bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full text-green-300 border border-green-400/20 shadow-sm">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" /> {ordersChange > 0 ? `+${ordersChange}%` : 'ثابت'}
                </span>
              ) : (
                <span className="flex items-center bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full text-red-300 border border-red-400/20 shadow-sm">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" /> {ordersChange}%
                </span>
              )}
              <span className="mr-2 text-white/70 font-medium">عن أمس</span>
            </div>
          </div>
        </div>

        {/* Card 4 - Customers */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-[28px] p-6 text-white shadow-xl shadow-pink-500/20 relative overflow-hidden group pointer hover:shadow-pink-500/40 hover:-translate-y-1 transition-all duration-300 border border-white/10 backdrop-blur-sm z-10">
          <div className="absolute top-4 right-4 flex items-center justify-center z-0 group-hover:scale-110 transition-transform duration-500" style={{ animationDelay: '1.5s' }}>
            <span className="text-[3.5rem] md:text-[5rem] leading-none drop-shadow-[0_4px_20px_rgba(255,255,255,0.4)]">👥</span>
          </div>
          <div className="relative z-10">
            <p className="text-pink-100 text-sm font-semibold mb-2 tracking-wide uppercase">إجمالي العملاء</p>
            <h3 className="text-4xl font-black mb-4 tracking-tight drop-shadow-sm">{stats.totalCustomers.toLocaleString()}</h3>
            <div className="flex items-center text-xs font-semibold">
              <span className="flex items-center bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-sm text-pink-50">
                <Users className="w-3.5 h-3.5 mr-1" /> مسجلين
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* --- FINANCIAL SUMMARY ROW --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Customer Debts */}
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
           <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <DollarSign className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">مستحقات عند العملاء</p>
              <h4 className="text-2xl font-black text-slate-800">{(stats.totalCustomerDebt || 0).toLocaleString()} <small className="text-xs opacity-60">ج.م</small></h4>
            </div>
          </div>
          <div className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1.5 rounded-full relative z-10">تحصيل</div>
        </div>

        {/* Supplier Debts */}
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
           <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
              <TrendingDown className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">مديونية للموردين</p>
              <h4 className="text-2xl font-black text-slate-800">{(stats.totalSupplierDebt || 0).toLocaleString()} <small className="text-xs opacity-60">ج.م</small></h4>
            </div>
          </div>
          <div className="bg-rose-100 text-rose-700 text-[10px] font-black px-3 py-1.5 rounded-full relative z-10">سداد</div>
        </div>

        {/* Stock Value */}
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">قيمة المخزون المقدرة</p>
              <h4 className="text-2xl font-black text-slate-800">{(stats.totalStockValue || 0).toLocaleString()} <small className="text-xs opacity-60">ج.م</small></h4>
            </div>
          </div>
          <div className="bg-blue-100 text-blue-700 text-[10px] font-black px-3 py-1.5 rounded-full relative z-10">أصول</div>
        </div>
      </div>

      {/* --- RECENT ORDERS LIST --- */}
      <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-[28px] p-8 shadow-xl shadow-slate-200/40 mb-8 transition-all hover:shadow-slate-300/50">
        <h2 className="text-[#1E1B4B] font-black text-xl mb-6 flex items-center">
          <Activity className="w-5 h-5 ml-2 text-indigo-500" />
          آخر الطلبات
        </h2>

        <div className="space-y-3">
          {recentOrders.length > 0 ? recentOrders.map((order) => (
            <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 px-6 bg-slate-50/50 border border-slate-100/80 rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-100 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md gap-4">
              <div className="flex items-center min-w-0 flex-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ml-4 shadow-inner transition-colors flex-shrink-0 ${
                  order.type === 'payment' ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200' :
                  order.type === 'factory' ? 'bg-amber-100 text-amber-600 group-hover:bg-amber-200' :
                  'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200'
                }`}>
                  {order.type === 'payment' ? <DollarSign className="w-6 h-6" /> : order.type === 'factory' ? <Package className="w-6 h-6" /> : order.customer.charAt(0)}
                </div>
                <span className="font-bold text-black group-hover:text-indigo-900 transition-colors truncate">
                    {order.customer || 'نقدي'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="font-black text-slate-800 text-lg whitespace-nowrap">
                  {order.amount.toLocaleString()} <span className="text-sm text-slate-500 font-semibold">ج.م</span>
                </div>

                <div className="text-slate-500 text-sm font-semibold flex items-center whitespace-nowrap">
                  {order.type === 'payment' ? (
                    <span className="text-emerald-600 flex items-center"><CheckCircle2 className="w-4 h-4 ml-1" /> تحصيل نقدي</span>
                  ) : order.type === 'factory' ? (
                    <span className="text-amber-600 flex items-center"><TrendingUp className="w-4 h-4 ml-1" /> طلب مصنع</span>
                  ) : (
                    <><Package className="w-4 h-4 ml-1 opacity-70" /> {order.items} منتجات</>
                  )}
                </div>

                <div className="text-slate-500 text-sm font-semibold flex items-center whitespace-nowrap">
                  <Clock className="w-4 h-4 ml-1 opacity-70" />
                  {order.time}
                </div>

                <div className={`font-bold text-sm px-4 py-1.5 rounded-full text-center whitespace-nowrap ${
                  (order.paymentMethod || '').toLowerCase() === 'cash' ? 'bg-emerald-100 text-emerald-700' : 
                  (order.paymentMethod || '').toLowerCase() === 'vodafone_cash' || (order.paymentMethod || '').toLowerCase() === 'wallet' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {(() => {
                    const m = String(order.paymentMethod || '').toLowerCase();
                    if (m === 'cash' || m === 'نقدي') return 'نقدي';
                    if (m === 'wallet' || m === 'محفظة إلكترونية' || m === 'vodafone_cash') return 'فودافون كاش';
                    if (m === 'instapay' || m === 'انستا باي') return 'انستا باي';
                    if (m === 'bank' || m === 'bank_transfer' || m === 'تحويل بنكي') return 'تحويل بنكي';
                    if (m === 'check' || m === 'شيك') return 'شيك';
                    return m || 'غير محدد';
                  })()}
                </div>
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <span className="font-semibold">لا توجد طلبات حتى الآن في هذه الوردية</span>
            </div>
          )}
        </div>
      </div>

      {/* --- CHARTS ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* BIG CHART: Sales over the last 7 days */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-md border border-white/50 p-8 rounded-[28px] shadow-xl shadow-slate-200/40 animate-card-enter animate-card-enter-6">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[#1E1B4B] font-black text-lg flex items-center">
              <TrendingUp className="w-5 h-5 ml-2 text-indigo-500" />
              نشاط المبيعات (آخر 7 أيام)
            </h3>
            <div className="flex items-center space-x-4 text-sm font-semibold">
              <div className="flex items-center text-[#5235E8]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5235E8] mr-2"></span> الإيرادات
              </div>
              <div className="flex items-center text-[#F59E0B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] mr-2"></span> الطلبات
              </div>
            </div>
          </div>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5235E8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5235E8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#F59E0B', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontWeight: 600, backdropFilter: 'blur(10px)' }}
                    formatter={(value, name) => [
                      name === 'revenue' ? `${value.toLocaleString()} ج.م` : value,
                      name === 'revenue' ? 'الإيرادات' : 'الطلبات'
                    ]}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#5235E8"
                    strokeWidth={3}
                    fill="url(#colorRevenue)"
                    dot={false}
                    activeDot={{ r: 8, strokeWidth: 3, stroke: 'white', fill: '#5235E8' }}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fill="url(#colorOrders)"
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#F59E0B' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                لا توجد بيانات مبيعات لآخر 7 أيام
              </div>
            )}
          </div>
        </div>

        {/* SUMMARY CARD */}
        {/* SUMMARY CARD */}
        <div className="bg-white border-2 border-slate-200 rounded-[28px] p-8 shadow-2xl shadow-slate-200/50 relative overflow-hidden text-slate-900 flex flex-col justify-between group animate-card-enter animate-card-enter-6">
          {/* Background Texture & Glow */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-400 to-transparent z-0 transition-opacity group-hover:opacity-10"></div>
          
          <div className="relative z-10">
            <h3 className="text-slate-500 font-bold mb-2 text-sm tracking-widest uppercase flex items-center">
              <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
              ملخص إحصائيات اليوم
            </h3>
            <h2 className="text-5xl font-black mb-1 tracking-tight text-black z-20">
              {todayStats.sales.toLocaleString()}
            </h2>
            <p className="text-slate-500 text-sm font-bold mt-2 z-20">إجمالي الإيرادات <span className="text-xs">ج.م</span></p>
          </div>

          <div className="relative z-10 mt-10 mb-6 space-y-3 p-1">
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-2xl hover:bg-slate-100 transition-colors cursor-default">
              <span className="text-slate-600 text-sm font-bold flex items-center">
                <ShoppingCart className="w-4 h-4 mr-2 text-purple-500" /> عدد الفواتير والطلبات
              </span>
              <span className="text-2xl font-black text-black">{todayStats.orders}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-2xl hover:bg-slate-100 transition-colors cursor-default">
              <span className="text-slate-600 text-sm font-bold flex items-center">
                <Users className="w-4 h-4 mr-2 text-purple-500" /> إجمالي العملاء
              </span>
              <span className="text-2xl font-black text-black">{stats.totalCustomers}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <div onClick={() => openAuditModal('supplier_debts')} className="bg-rose-50 border border-rose-100 p-3 rounded-2xl cursor-pointer hover:bg-rose-100 transition-colors">
                 <p className="text-rose-700 text-[10px] font-bold mb-1 flex justify-between items-center">ديون الموردين <Search className="w-3 h-3"/></p>
                 <p className="text-lg font-black text-rose-900">{todayStats.supplierDebts.toLocaleString()}</p>
               </div>
               <div onClick={() => openAuditModal('customer_debts')} className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl cursor-pointer hover:bg-emerald-100 transition-colors">
                 <p className="text-emerald-700 text-[10px] font-bold mb-1 flex justify-between items-center">مستحقات العملاء <Search className="w-3 h-3"/></p>
                 <p className="text-lg font-black text-emerald-900">{todayStats.customerDebts.toLocaleString()}</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
               <div className="bg-orange-50 border border-orange-100 p-3 rounded-2xl">
                 <p className="text-orange-700 text-[10px] font-bold mb-1">مصروفات اليوم</p>
                 <p className="text-lg font-black text-orange-900">{todayStats.expenses.toLocaleString()}</p>
               </div>
               <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl">
                 <p className="text-blue-700 text-[10px] font-bold mb-1 flex justify-between items-center">مصروفات الوردية <Clock className="w-3 h-3"/></p>
                 <p className="text-lg font-black text-blue-900">{todayStats.shiftExpenses ? todayStats.shiftExpenses.toLocaleString() : '0'}</p>
               </div>
            </div>
            <div className="flex justify-between items-center bg-purple-50 border border-purple-100 p-4 rounded-2xl hover:bg-purple-100 transition-colors cursor-default mt-2">
              <span className="text-purple-700 text-sm font-bold flex items-center">
                <DollarSign className="w-4 h-4 mr-2" /> قيمة المخزون
              </span>
              <span className="text-2xl font-black text-black">{(stats.totalStockValue || 0).toLocaleString()} <small className="text-xs">ج.م</small></span>
            </div>
          </div>

          {salesChange !== 0 && (
            <div className="relative z-10 flex items-center text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-center w-full justify-center shadow-inner">
              {salesChange >= 0 ? (
                <><TrendingUp className="w-4 h-4 mr-2 text-emerald-400" /> <span className="text-emerald-50">+{salesChange}% ارتفاع عن أمس</span></>
              ) : (
                <><TrendingDown className="w-4 h-4 mr-2 text-rose-400" /> <span className="text-rose-50">{Math.abs(salesChange)}% تراجع عن أمس</span></>
              )}
            </div>
          )}
        </div>

      </div>

      {/* AUDIT MODAL */}
      {auditModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 direction-rtl">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {auditModal.type === 'supplier' ? <TrendingDown className="h-6 w-6 text-rose-600" /> : <TrendingUp className="h-6 w-6 text-emerald-600" />}
                {auditModal.title}
              </h3>
              <button 
                onClick={() => {
                  soundManager.play('closeWindow');
                  setAuditModal({ ...auditModal, isOpen: false });
                }} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors font-bold text-slate-500 text-sm"
              >
                إغلاق
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 direction-rtl">
              {auditModal.data.length === 0 ? (
                <div className="text-center text-slate-500 py-10 font-bold">لا توجد بيانات مسجلة</div>
              ) : (
                <div className="space-y-3">
                  {auditModal.data.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="font-bold text-slate-800 text-lg">{item.name}</div>
                      <div className={`font-black text-xl ${auditModal.type === 'supplier' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {item.netDebt.toLocaleString()} <span className="text-sm font-normal text-slate-500">ج.م</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-4 bg-slate-800 text-white rounded-xl mt-4">
                      <div className="font-bold text-lg">الإجمالي الكلي:</div>
                      <div className="font-black text-2xl">
                        {auditModal.data.reduce((sum, item) => sum + item.netDebt, 0).toLocaleString()} <span className="text-sm font-normal text-slate-300">ج.م</span>
                      </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;