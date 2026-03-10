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
  Clock
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
    dailySupplyQty: 0
  });

  const [allTimeSales, setAllTimeSales] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({ sales: 0, orders: 0, customers: 0 });
  const [yesterdayStats, setYesterdayStats] = useState({ sales: 0, orders: 0, customers: 0 });

  // Build chart data from real sales — group by last 7 days
  const chartData = useMemo(() => {
    if (!allTimeSales || allTimeSales.length === 0) return [];

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
      const revenue = daySales.reduce((sum, s) => sum + (parseFloat(s.total || s.totalAmount) || 0), 0);
      const orders = daySales.length;
      const dayLabel = new Date(day).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' });
      return { day: dayLabel, revenue: Math.round(revenue), orders };
    });
  }, [allTimeSales]);

  // Calculate percentage change
  const calcChange = (today, yesterday) => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const salesChange = calcChange(todayStats.sales, yesterdayStats.sales);
  const ordersChange = calcChange(todayStats.orders, yesterdayStats.orders);
  const customersChange = calcChange(todayStats.customers, yesterdayStats.customers);

  // Business Logic from existing Dashboard — uses all sales, not just shift
  const analyzeRealData = () => {
    try {
      // Only clear cache when absolutely necessary or if we want to ensure freshness
      // but doing it every time causes flickering
      const allSales = storageOptimizer.get('sales', []) || [];
      const products = storageOptimizer.get('products', []) || [];
      const customers = storageOptimizer.get('customers', []) || [];

      setAllTimeSales(allSales);

      // Today's stats
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const todaySales = allSales.filter(s => (s.date || s.createdAt || '').split('T')[0] === today);
      const yesterdaySales = allSales.filter(s => (s.date || s.createdAt || '').split('T')[0] === yesterday);

      const todayRevenue = todaySales.reduce((sum, s) => sum + (parseFloat(s.total || s.totalAmount) || 0), 0);
      const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + (parseFloat(s.total || s.totalAmount) || 0), 0);

      setTodayStats({ sales: todayRevenue, orders: todaySales.length, customers: customers.length });
      setYesterdayStats({ sales: yesterdayRevenue, orders: yesterdaySales.length, customers: Math.max(customers.length - 1, 0) });

      // Active shift specific stats
      const activeShift = storageOptimizer.get('activeShift', null);
      let shiftSales = allSales;
      if (activeShift && activeShift.id) {
        shiftSales = allSales.filter(s => s.shiftId === activeShift.id);
      }

      const totalSales = shiftSales.reduce((sum, sale) => safeMath.add(sum, sale.total || sale.totalAmount || 0), 0);
      const totalOrders = shiftSales.length;

      const recent = shiftSales
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
        .slice(0, 5)
        .map(sale => ({
          id: sale.id,
          customer: sale.customer?.name || sale.customerName || sale.customerInfo?.name || (typeof sale.customer === 'string' ? sale.customer : 'نقدي'),
          amount: parseFloat(sale.total || sale.totalAmount) || 0,
          time: formatTimeOnly(sale.date || sale.createdAt),
          items: sale.items?.length || (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]').length : 0),
          paymentMethod: sale.paymentMethod || 'cash'
        }));

      // Calculate Daily Supply Quantity
      const allSupplies = storageOptimizer.get('supplier_supplies', []) || [];
      const dailySupplyQty = allSupplies
        .filter(s => (s.date || '').split('T')[0] === today)
        .reduce((sum, s) => sum + (parseFloat(s.quantity) || 0), 0);

      setStats({
        totalSales,
        totalOrders,
        totalCustomers: customers.length,
        dailySupplyQty: dailySupplyQty
      });

      setRecentOrders(recent);
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

      // مزامنة التوريدات والمدفوعات (من جداول Setting)
      const settings = await supabaseService.getSettings();
      if (settings && settings.length > 0) {
        const suppliesRecord = settings.find(s => s.key === 'supplier_supplies');
        if (suppliesRecord) localStorage.setItem('supplier_supplies', suppliesRecord.value);

        const paymentsRecord = settings.find(s => s.key === 'supplier_payments');
        if (paymentsRecord) localStorage.setItem('supplier_payments', paymentsRecord.value);
      }

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
          <p className="text-gray-500 text-sm mt-1">مرحباً {userName} 👋</p>
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

      {/* --- 4 STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6" style={{ overflow: 'visible' }}>

        {/* Card 1 - Daily Supply Qty */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[28px] p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group cursor-pointer hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300 border border-white/10 backdrop-blur-sm z-10">
          <div className="absolute top-2 right-2 flex items-center justify-center z-0 group-hover:scale-110 transition-transform duration-500">
            <span className="text-[5.7rem] leading-none drop-shadow-[0_4px_20px_rgba(255,255,255,0.3)]">🚚</span>
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
          <div className="absolute top-2 right-2 flex items-center justify-center z-0 group-hover:scale-110 transition-transform duration-500" style={{ animationDelay: '0.5s' }}>
            <span className="text-[5.7rem] leading-none drop-shadow-[0_4px_20px_rgba(255,255,255,0.3)]">💰</span>
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
                  <TrendingDown className="w-3.5 h-3.5 mr-1" /> {salesChange}%
                </span>
              )}
              <span className="mr-2 text-white/70 font-medium">عن أمس</span>
            </div>
          </div>
        </div>

        {/* Card 3 - Total Orders */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[28px] p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group cursor-pointer hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300 border border-white/10 backdrop-blur-sm z-10">
          <div className="absolute top-2 right-2 flex items-center justify-center z-0 group-hover:scale-110 transition-transform duration-500" style={{ animationDelay: '1s' }}>
            <span className="text-[5.7rem] leading-none drop-shadow-[0_4px_20px_rgba(255,255,255,0.3)]">🛒</span>
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
        <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-[28px] p-6 text-white shadow-xl shadow-pink-500/20 relative overflow-hidden group cursor-pointer hover:shadow-pink-500/40 hover:-translate-y-1 transition-all duration-300 border border-white/10 backdrop-blur-sm z-10">
          <div className="absolute top-2 right-2 flex items-center justify-center z-0 group-hover:scale-110 transition-transform duration-500" style={{ animationDelay: '1.5s' }}>
            <span className="text-[5.7rem] leading-none drop-shadow-[0_4px_20px_rgba(255,255,255,0.3)]">👥</span>
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

      {/* --- RECENT ORDERS LIST --- */}
      <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-[28px] p-8 shadow-xl shadow-slate-200/40 mb-8 transition-all hover:shadow-slate-300/50">
        <h2 className="text-[#1E1B4B] font-black text-xl mb-6 flex items-center">
          <Activity className="w-5 h-5 ml-2 text-indigo-500" />
          آخر الطلبات
        </h2>

        <div className="space-y-3">
          {recentOrders.length > 0 ? recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between py-4 px-6 bg-slate-50/50 border border-slate-100/80 rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-100 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md">
              <div className="flex items-center min-w-[200px]">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold ml-4 shadow-inner group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors">
                  {order.customer.charAt(0)}
                </div>
                <span className="font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">
                  <span className="truncate max-w-[120px]">
                    {order.customer || 'نقدي'}
                  </span>
                </span>
              </div>

              <div className="min-w-[120px] font-black text-slate-800 text-lg">
                {order.amount.toLocaleString()} <span className="text-sm text-slate-500 font-semibold">ج.م</span>
              </div>

              <div className="min-w-[120px] text-slate-500 text-sm font-semibold flex items-center">
                <Package className="w-4 h-4 ml-1 opacity-70" />
                {order.items} منتجات
              </div>

              <div className="min-w-[120px] text-slate-500 text-sm font-semibold flex items-center">
                <Clock className="w-4 h-4 ml-1 opacity-70" />
                {order.time}
              </div>

              <div className={`min-w-[100px] font-bold text-sm px-4 py-1.5 rounded-full text-center ${order.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                {order.customer !== 'نقدي' ? order.customer : (order.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة')}
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
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontWeight: 600, backdropFilter: 'blur(10px)' }}
                    formatter={(value, name) => [
                      name === 'revenue' ? `${value.toLocaleString()} ج.م` : value,
                      name === 'revenue' ? 'الإيرادات' : 'الطلبات'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#5235E8"
                    strokeWidth={3}
                    fill="url(#colorRevenue)"
                    dot={false}
                    activeDot={{ r: 8, strokeWidth: 3, stroke: 'white', fill: '#5235E8' }}
                  />
                  <Area
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
        <div className="bg-gradient-to-br from-indigo-900 via-[#362082] to-purple-950 border border-purple-500/30 rounded-[28px] p-8 shadow-2xl shadow-indigo-900/40 relative overflow-hidden text-white flex flex-col justify-between group animate-card-enter animate-card-enter-6">
          {/* Background Texture & Glow */}
          <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-400/20 via-transparent to-transparent z-0 transition-opacity group-hover:opacity-60"></div>
          {/* Shimmer overlay */}
          <div className="absolute inset-0 animate-shimmer pointer-events-none z-0 rounded-[28px]"></div>

          <div className="relative z-10">
            <h3 className="text-indigo-200 font-semibold mb-2 text-sm tracking-widest uppercase flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2 animate-pulse"></span>
              ملخص واحصائيات اليوم
            </h3>
            <h2 className="text-5xl font-black mb-1 drop-shadow-md tracking-tight text-emerald-400 z-20 animate-number-pop">
              {todayStats.sales.toLocaleString()}
            </h2>
            <p className="text-purple-200/80 text-sm font-medium mt-2 z-20">إجمالي الإيرادات <span className="text-xs">ج.م</span></p>
          </div>

          <div className="relative z-10 mt-10 mb-6 space-y-3 p-1">
            <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors cursor-default">
              <span className="text-indigo-100 text-sm font-medium flex items-center">
                <ShoppingCart className="w-4 h-4 mr-2 text-indigo-300" /> عدد الفواتير
              </span>
              <span className="text-2xl font-black text-emerald-400">{todayStats.orders}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors cursor-default">
              <span className="text-indigo-100 text-sm font-medium flex items-center">
                <Users className="w-4 h-4 mr-2 text-indigo-300" /> إجمالي العملاء
              </span>
              <span className="text-2xl font-black text-emerald-400">{stats.totalCustomers}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors cursor-default">
              <span className="text-indigo-100 text-sm font-medium flex items-center">
                <Package className="w-4 h-4 mr-2 text-indigo-300" /> إجمالي المنتجات
              </span>
              <span className="text-2xl font-black text-emerald-400">{stats.totalProducts}</span>
            </div>
          </div>

          {salesChange !== 0 && (
            <div className="relative z-10 flex items-center text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-center w-full justify-center shadow-inner">
              {salesChange >= 0 ? (
                <><TrendingUp className="w-4 h-4 mr-2 text-emerald-400" /> <span className="text-emerald-50">+{salesChange}% ارتفاع عن أمس</span></>
              ) : (
                <><TrendingDown className="w-4 h-4 mr-2 text-rose-400" /> <span className="text-rose-50">{salesChange}% تراجع عن أمس</span></>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default Dashboard;