import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Truck,
  Settings,
  DollarSign,
  Clock,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import soundManager from '../utils/soundManager.js';
import { syncManager } from '../utils/syncManager';

const Sidebar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { user, logout, hasPermission, hasRole } = useAuth();

  const menuItems = [
    { path: "/", icon: LayoutDashboard, label: "لوحة التحكم", permission: null },
    { path: "/pos", icon: ShoppingCart, label: "نقطة البيع", permission: "pos_access" },
    { path: "/products", icon: Package, label: "المنتجات", permission: "manage_products" },
    { path: "/reports", icon: BarChart3, label: "التقارير", permission: "view_reports" },
    { path: "/customers", icon: Users, label: "العملاء", permission: "customer_access" },
    { path: "/suppliers", icon: Truck, label: "الموردين", permission: "customer_access" },
    { path: "/expenses", icon: DollarSign, label: "المصروفات", permission: "view_reports" },
    { path: "/settings", icon: Settings, label: "الإعدادات", role: "admin" },
    { path: "/shifts", icon: Clock, label: "الورديات", permission: "manage_shifts" }
  ].filter(item => {
    if (hasRole('admin')) return true;
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.role && !hasRole(item.role)) return false;
    return true;
  });

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#5235E8] text-white p-4 flex justify-between items-center z-50 flex-shrink-0 shadow-md">
        <div className="flex items-center">
          <span className="text-2xl drop-shadow-md">👑</span>
        </div>

        {/* اسم الصفحة النشطة في المنتصف */}
        <div className="flex-1 flex justify-center px-2">
          <h1 className="text-lg font-bold tracking-wide text-white drop-shadow-md select-none">
            {menuItems.find(item => item.path === location.pathname)?.label || 'لوحة التحكم'}
          </h1>
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`
          fixed md:static inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          w-64 lg:w-[260px]
          bg-[#5235E8] md:bg-transparent text-white flex flex-col h-full md:h-screen flex-shrink-0
          shadow-2xl md:shadow-none overflow-visible
        `}
      >

        {/* TOP PART - Crown Header (Fixed Width) */}
        <div className="w-full md:w-[260px] bg-[#5235E8] md:rounded-br-[2rem] pt-6 px-3 flex-shrink-0 relative z-20 md:shadow-[5px_5px_15px_rgba(82,53,232,0.1)] transition-all duration-300 pb-2">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl text-center relative shadow-xl overflow-visible border border-purple-700/50 group mb-0"
            style={{ padding: '16px 8px' }}
          >
            {/* Crown */}
            <div className="mb-2">
              <span className="drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] text-4xl">👑</span>
            </div>
            {/* Text - Always full size now */}
            <div>
              <h1 className="font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 text-lg whitespace-nowrap">
                ELKING PRO V2
              </h1>
              <p className="text-[10px] text-purple-300 font-medium block">نظام إدارة متكامل</p>
            </div>
          </div>
        </div>

        {/* MIDDLE PART - Navigation (The moving part) */}
        <div className={`
          w-full md:bg-[#5235E8] flex-1 overflow-hidden flex flex-col py-2
          transition-all duration-300 ease-in-out md:shadow-[5px_5px_15px_rgba(82,53,232,0.1)] relative z-10
          md:my-5 md:py-4
          ${isExpanded ? 'md:w-[260px] md:rounded-r-[2rem]' : 'md:w-[130px] md:rounded-r-[2rem]'}
        `}>
          <nav className="flex-1 px-2 flex flex-col gap-1 mt-2 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const shouldShowLabels = isExpanded || isMobileOpen;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    soundManager.play('click');
                    setIsMobileOpen(false);
                  }}
                  className={`
                  relative flex items-center rounded-2xl group transition-all duration-300 font-medium overflow-hidden
                  ${shouldShowLabels ? 'px-4 py-3.5 mx-1' : 'px-0 py-3 mx-1 justify-center'}
                  ${isActive
                      ? 'bg-gradient-to-r from-white to-indigo-50 text-[#5235E8] shadow-[0_8px_30px_rgb(0,0,0,0.12)] scale-[1.02] border border-white/20'
                      : 'text-white/80 hover:bg-white/10 hover:text-white hover:shadow-lg'
                    }
                `}
                >
                  {/* Icon container */}
                  <div className={`flex items-center justify-center shrink-0 w-10 h-10 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-100 shadow-inner' : 'group-hover:bg-white/10'}`}>
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-all duration-300 ${isActive ? 'text-[#5235E8] drop-shadow-md' : 'text-white/70 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>

                  {/* Label - slides in from left */}
                  <span
                    className={`
                    whitespace-nowrap text-[14px] transition-all duration-300 ease-out
                    ${shouldShowLabels
                        ? 'ml-3 opacity-100 translate-x-0 w-auto'
                        : 'ml-0 opacity-0 -translate-x-4 w-0 overflow-hidden'
                      }
                    ${isActive ? 'font-black tracking-wide text-indigo-900' : 'font-semibold tracking-wide'}
                  `}
                  >
                    {item.label}
                  </span>

                  {/* Active indicator dot (when collapsed) */}
                  {isActive && !shouldShowLabels && (
                    <div className="absolute -left-[2px] top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM PART - Admin & Sync Status */}
        <div className="w-full md:w-[260px] bg-[#5235E8] md:rounded-tr-[2rem] px-3 pb-6 pt-4 flex-shrink-0 relative z-20 md:shadow-[5px_-5px_15px_rgba(82,53,232,0.1)] transition-all duration-300 mt-auto">
          {/* Sync Status - Always visible now */}
          <div className="mb-3">
            <SyncStatus />
          </div>

          {/* User Info & Logout - Always visible full details */}
          <div className="bg-white/10 rounded-2xl p-3 transition-all duration-300">
            <div className="flex items-center mb-3 justify-start overflow-hidden">
              <div className="bg-white/20 rounded-full flex items-center justify-center shrink-0 w-9 h-9 mr-3">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold truncate text-sm">
                  {user?.name || user?.username || 'مستخدم'}
                </p>
                <p className="text-white/50 truncate text-xs block">
                  {user?.role === 'admin' ? 'مدير عام' : user?.role === 'manager' ? 'مدير' : 'كاشير'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundManager.play('logout');
                if (window.confirm('هل تريد تسجيل الخروج من السيستم؟')) {
                  logout();
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white rounded-xl transition-all duration-200 py-2 px-4 text-sm font-semibold"
              title="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap opacity-100">تسجيل الخروج</span>
            </button>
          </div>
        </div>

      </div >
    </>
  );
};

const SyncStatus = () => {
  const [status, setStatus] = React.useState({ pendingCount: 0, isOnline: true });

  React.useEffect(() => {
    const updateStatus = () => { setStatus(syncManager.getStatus()); };
    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (status.isOnline && status.pendingCount === 0) {
    return (
      <div className="flex items-center text-xs text-green-300 bg-white/5 p-2 rounded-xl">
        <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
        <span>متصل بالسحابة</span>
      </div>
    );
  }
  if (!status.isOnline) {
    return (
      <div className="flex items-center text-xs text-orange-300 bg-orange-500/10 p-2 rounded-xl">
        <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
        <span>وضع الأوفلاين</span>
      </div>
    );
  }
  return (
    <div className="flex items-center text-xs text-blue-300 bg-blue-500/10 p-2 rounded-xl">
      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-spin"></div>
      <span>مزامنة {status.pendingCount} عناصر...</span>
    </div>
  );
};

export default Sidebar;