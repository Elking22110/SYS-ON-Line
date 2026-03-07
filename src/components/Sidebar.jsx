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
  HeartPulse,
  CreditCard,
  Menu,
  X,
  LogOut
} from "lucide-react";
import soundManager from '../utils/soundManager.js';
import { syncManager } from '../utils/syncManager';

const Sidebar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout, hasPermission, hasRole } = useAuth();

  const menuItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard", shortcut: "Ctrl+1", permission: null },
    { path: "/pos", icon: ShoppingCart, label: "Claims", shortcut: "Ctrl+2", permission: "pos_access" },
    { path: "/products", icon: Package, label: "Biller Queue", shortcut: "Ctrl+3", permission: "manage_products" },
    { path: "/reports", icon: BarChart3, label: "Subscription", shortcut: "Ctrl+4", permission: "view_reports" },
    { path: "/customers", icon: Users, label: "Health", shortcut: "Ctrl+5", permission: "customer_access" },
    // Only keeping a few to match design, but we can map the actual features to these names or keep their original names.
    // The user's system holds Arabic titles. The prompt says "change the design only for the better to this shape". 
    // This usually means keep their text Arabic but apply the style. Let's use Arabic text with the design.
  ];

  // We will map their original items to the new look.
  const actualMenuItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard", permission: null },
    { path: "/pos", icon: ShoppingCart, label: "Claims", permission: "pos_access" },
    { path: "/products", icon: Package, label: "Biller Queue", permission: "manage_products" },
    { path: "/reports", icon: BarChart3, label: "Subscription", permission: "view_reports" },
    { path: "/customers", icon: HeartPulse, label: "Health", permission: "customer_access" }
  ];

  // Let's use the exact names from their original Sidebar, to not break their system usage.
  const originalMenuItems = [
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
      <div className="md:hidden bg-[#5235E8] text-white p-4 flex justify-between items-center z-50 flex-shrink-0">
        <div className="flex items-center">
          <img
            src="./logo.png"
            alt="Elking Logo"
            className="w-8 h-8 object-contain mr-3 bg-white/10 rounded-lg p-1"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          <h1 className="text-xl font-black tracking-wider text-white">Elking</h1>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors focus:outline-none"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        w-64 md:w-75 lg:w-[280px] bg-[#5235E8] text-white flex flex-col h-full md:h-screen flex-shrink-0 overflow-y-auto custom-scrollbar shadow-2xl md:shadow-none
      `}>

        {/* Header Logo (Hidden on mobile inside sidebar as it's in top bar, or keep if preferred? Actually let's hide on mobile) */}
        <div className="hidden md:flex p-8 pb-4 items-center mb-6 mt-4">
          <img
            src="./logo.png"
            alt="Elking Logo"
            className="w-10 h-10 object-contain mr-3 shrink-0 bg-white/10 rounded-lg p-1"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-black tracking-wider text-white shrink-0">
            Elking
          </h1>
        </div>


        {/* Navigation */}
        <nav className="flex-1 px-4 relative z-10 flex flex-col gap-2 mt-4 md:mt-0">
          {originalMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  soundManager.play('click');
                  setIsMobileOpen(false);
                }}
                className={`flex items-center space-x-4 px-6 py-3.5 mx-2 rounded-2xl group transition-all duration-300 font-medium ${isActive
                  ? 'bg-white text-[#5235E8] shadow-lg scale-105'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <div className="flex items-center justify-center shrink-0">
                  {/* Fixed space issue by removing margin right if no RTL and applying standard space */}
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-[#5235E8]' : 'text-white/70 group-hover:text-white'}`} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[15px] shrink-0 ml-4 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sync Status Indicator */}
        <div className="px-6 mb-4">
          <SyncStatus />
        </div>

        {/* User Info & Logout */}
        <div className="px-6 mb-4">
          <div className="bg-white/10 rounded-2xl p-4">
            <div className="flex items-center mb-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mr-3 shrink-0">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-bold truncate">{user?.name || user?.username || 'مستخدم'}</p>
                <p className="text-white/50 text-xs truncate">
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
              className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Upgrade Box (From Design) */}
        <div className="p-6 mt-auto">
          <div className="bg-white rounded-3xl p-6 text-center relative shadow-2xl overflow-visible">
            {/* Rocket illustration placeholder */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-24 h-24 flex items-center justify-center">
              <div className="relative w-full h-full flex flex-col items-center justify-center animate-bounce">
                <span className="text-6xl drop-shadow-md pb-4 shrink-0">🚀</span>
                <div className="absolute bottom-2 w-16 h-4 bg-gray-200 rounded-[100%] blur-sm opacity-50 z-[-1]"></div>
              </div>
            </div>

            <div className="mt-8 mb-4 shrink-0">
              <h3 className="text-[#1E1B4B] font-bold text-sm mb-1">Want to upgrade</h3>
            </div>
            <button className="w-full shrink-0 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-transform hover:scale-105 shadow-md border-0">
              Upgrade now
            </button>
          </div>
        </div>

      </div>
    </>
  );
};

const SyncStatus = () => {
  const [status, setStatus] = React.useState({ pendingCount: 0, isOnline: true });

  React.useEffect(() => {
    const updateStatus = () => {
      setStatus(syncManager.getStatus());
    };

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
        <span>وضع الأوفلاين (سيتم الرفع لاحقاً)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center text-xs text-blue-300 bg-blue-500/10 p-2 rounded-xl">
      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-spin"></div>
      <span>جاري مزامنة {status.pendingCount} عناصر...</span>
    </div>
  );
};

export default Sidebar;