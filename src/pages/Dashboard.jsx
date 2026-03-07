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
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import soundManager from '../utils/soundManager.js';
import storageOptimizer from '../utils/storageOptimizer.js';
import { formatTimeOnly, getCurrentDate, getLocalDateString, formatDateTime } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import supabaseService from '../utils/supabaseService.js';
import { useAuth } from '../components/AuthProvider';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0
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
          customer: sale.customer?.name || 'عميل نقدي',
          amount: parseFloat(sale.total || sale.totalAmount) || 0,
          time: formatTimeOnly(sale.date || sale.createdAt),
          items: sale.items?.length || (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]').length : 0),
          paymentMethod: sale.paymentMethod || 'cash'
        }));

      setStats({
        totalSales,
        totalOrders,
        totalCustomers: customers.length,
        totalProducts: products.length
      });

      setRecentOrders(recent);
    } catch (error) {
      console.error('Data analysis error:', error);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    soundManager.play('refresh');
    await syncWithSupabase();
    analyzeRealData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const syncWithSupabase = async () => {
    try {
      const [products, customers, sales] = await Promise.all([
        supabaseService.getProducts(),
        supabaseService.getCustomers(),
        supabaseService.getSales()
      ]);
      if (products && products.length) localStorage.setItem('products', JSON.stringify(products));
      if (customers && customers.length) localStorage.setItem('customers', JSON.stringify(customers));
      if (sales && sales.length) localStorage.setItem('sales', JSON.stringify(sales));
      analyzeRealData();
    } catch (error) {
      console.error('Dashboard sync error:', error);
    }
  };

  useEffect(() => {
    syncWithSupabase();
    analyzeRealData();
    const handleStorageChange = () => analyzeRealData();
    const interval = setInterval(analyzeRealData, 10000);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dataUpdated', handleStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataUpdated', handleStorageChange);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

        {/* Card 1 - Total Products */}
        <div className="bg-[#785EED] rounded-[24px] p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer hover:bg-[#6b51e0] transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-500">
            <Package className="w-24 h-24" />
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">إجمالي المنتجات</p>
          <h3 className="text-3xl font-bold mb-4">{stats.totalProducts.toLocaleString()}</h3>
          <div className="flex items-center text-xs font-semibold">
            <span className="flex items-center bg-white/20 px-2 py-1 rounded-full">
              <Package className="w-3 h-3 mr-1" /> في المخزون
            </span>
          </div>
        </div>

        {/* Card 2 - Total Sales Today */}
        <div className="bg-[#7C63F5] rounded-[24px] p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer hover:bg-[#6c54e0] transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-500">
            <DollarSign className="w-24 h-24" />
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">مبيعات الوردية</p>
          <h3 className="text-3xl font-bold mb-4">{stats.totalSales.toLocaleString()} ج.م</h3>
          <div className="flex items-center text-xs font-semibold">
            {salesChange >= 0 ? (
              <span className="flex items-center bg-white/20 px-2 py-1 rounded-full text-green-200">
                <TrendingUp className="w-3 h-3 mr-1" /> {salesChange > 0 ? `+${salesChange}%` : 'ثابت'}
              </span>
            ) : (
              <span className="flex items-center bg-white/20 px-2 py-1 rounded-full text-red-200">
                <TrendingDown className="w-3 h-3 mr-1" /> {salesChange}%
              </span>
            )}
            <span className="mr-2 text-white/60">عن أمس</span>
          </div>
        </div>

        {/* Card 3 - Total Orders */}
        <div className="bg-[#836AF5] rounded-[24px] p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer hover:bg-[#7259e0] transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-500">
            <ShoppingCart className="w-24 h-24" />
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">عدد الطلبات</p>
          <h3 className="text-3xl font-bold mb-4">{stats.totalOrders.toLocaleString()}</h3>
          <div className="flex items-center text-xs font-semibold">
            {ordersChange >= 0 ? (
              <span className="flex items-center bg-white/20 px-2 py-1 rounded-full text-green-200">
                <TrendingUp className="w-3 h-3 mr-1" /> {ordersChange > 0 ? `+${ordersChange}%` : 'ثابت'}
              </span>
            ) : (
              <span className="flex items-center bg-white/20 px-2 py-1 rounded-full text-red-200">
                <TrendingDown className="w-3 h-3 mr-1" /> {ordersChange}%
              </span>
            )}
            <span className="mr-2 text-white/60">عن أمس</span>
          </div>
        </div>

        {/* Card 4 - Customers */}
        <div className="bg-[#8B75FF] rounded-[24px] p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer hover:bg-[#7a64e6] transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-500">
            <Users className="w-24 h-24" />
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">إجمالي العملاء</p>
          <h3 className="text-3xl font-bold mb-4">{stats.totalCustomers.toLocaleString()}</h3>
          <div className="flex items-center text-xs font-semibold">
            <span className="flex items-center bg-white/20 px-2 py-1 rounded-full">
              <Users className="w-3 h-3 mr-1" /> مسجلين
            </span>
          </div>
        </div>

      </div>

      {/* --- RECENT ORDERS LIST --- */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm mb-6 ">
        <h2 className="text-[#1E1B4B] font-bold text-lg mb-4">آخر الطلبات</h2>

        <div className="space-y-0">
          {recentOrders.length > 0 ? recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-2 rounded-xl group">
              <div className="flex items-center min-w-[200px]">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold mr-4">
                  {order.customer.charAt(0)}
                </div>
                <span className="font-semibold text-gray-700">{order.customer}</span>
              </div>

              <div className="min-w-[120px] font-bold text-gray-800">
                {order.amount.toLocaleString()} ج.م
              </div>

              <div className="min-w-[120px] text-gray-500 text-sm font-medium">
                {order.items} منتج
              </div>

              <div className="min-w-[120px] text-gray-500 text-sm font-medium">
                {order.time}
              </div>

              <div className={`min-w-[80px] font-semibold text-sm ${order.paymentMethod === 'cash' ? 'text-green-500' : 'text-blue-500'}`}>
                {order.paymentMethod === 'cash' ? 'نقدي' : order.paymentMethod === 'card' ? 'بطاقة' : order.paymentMethod}
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-400 font-medium">
              لا توجد طلبات حتى الآن في هذه الوردية
            </div>
          )}
        </div>
      </div>

      {/* --- CHARTS ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* BIG CHART: Sales over the last 7 days */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[24px] shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[#1E1B4B] font-bold text-lg">نشاط المبيعات (آخر 7 أيام)</h3>
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
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 600 }}
                    formatter={(value, name) => [
                      name === 'revenue' ? `${value.toLocaleString()} ج.م` : value,
                      name === 'revenue' ? 'الإيرادات' : 'الطلبات'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#5235E8"
                    strokeWidth={4}
                    dot={false}
                    activeDot={{ r: 8, strokeWidth: 3, stroke: 'white', fill: '#5235E8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#F59E0B' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                لا توجد بيانات مبيعات لآخر 7 أيام
              </div>
            )}
          </div>
        </div>

        {/* SUMMARY CARD */}
        <div className="bg-[#4834D4] rounded-[24px] p-6 shadow-lg relative overflow-hidden text-white flex flex-col justify-between">
          {/* Background Texture */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.8), transparent)', backgroundSize: '150% 150%' }}></div>

          <div className="relative z-10">
            <h3 className="text-white/90 font-medium mb-1 text-sm">ملخص اليوم</h3>
            <h2 className="text-4xl font-bold mb-1">{todayStats.sales.toLocaleString()}</h2>
            <p className="text-white/80 text-sm font-medium">ج.م إيرادات اليوم</p>
          </div>

          <div className="relative z-10 mt-8 mb-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-sm">عدد الفواتير اليوم</span>
              <span className="text-xl font-bold">{todayStats.orders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-sm">إجمالي العملاء</span>
              <span className="text-xl font-bold">{stats.totalCustomers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-sm">إجمالي المنتجات</span>
              <span className="text-xl font-bold">{stats.totalProducts}</span>
            </div>
          </div>

          {salesChange !== 0 && (
            <div className="relative z-10 flex items-center text-xs text-white/80 font-medium bg-white/10 rounded-full px-3 py-2 w-fit">
              {salesChange >= 0 ? (
                <><TrendingUp className="w-3 h-3 mr-1 text-green-300" /> +{salesChange}% عن أمس</>
              ) : (
                <><TrendingDown className="w-3 h-3 mr-1 text-red-300" /> {salesChange}% عن أمس</>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default Dashboard;