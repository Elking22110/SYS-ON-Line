import React from "react";
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
  HeartPulse, // Added for "Health"
  CreditCard // Added for "Subscription"
} from "lucide-react";
import soundManager from '../utils/soundManager.js';
import { syncManager } from '../utils/syncManager';

const Sidebar = () => {
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
    <div className="w-64 md:w-72 lg:w-[280px] bg-[#5235E8] text-white flex flex-col h-screen flex-shrink-0 relative overflow-y-auto custom-scrollbar">

      {/* Header Logo */}
      <div className="p-8 pb-4 flex items-center mb-6 mt-4">
        {/* سيتم استبدال الصورة هنا بواسطة المستخدم */}
        <img
          src="./logo.png"
          alt="Elking Logo"
          className="w-10 h-10 object-contain mr-3 bg-white/10 rounded-lg p-1"
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = 'none'; // إخفاء في حالة عدم وجود اللوجو مؤقتا
          }}
        />
        <h1 className="text-2xl font-black tracking-wider text-white">
          Elking
        </h1>
      </div>


      {/* Navigation */}
      <nav className="flex-1 px-4 relative z-10 flex flex-col gap-2">
        {/* We use english tags from the screenshot or users Arabic tags? "Dashboard", "Claims", etc are in screenshot. Let's use English for exact match, or Arabic to preserve meaning. Let's use the english labels for the first 5 to match exactly, and the rest Arabic if they need them. Wait, user said "change the design only in this system". It's better to preserve their Arabic labels so the system is usable for them. */}
        {originalMenuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => soundManager.play('click')}
              className={`flex items-center space-x-4 px-6 py-3.5 mx-2 rounded-2xl group transition-all duration-300 font-medium ${isActive
                ? 'bg-white text-[#5235E8] shadow-lg scale-105'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
            >
              <div className="flex items-center justify-center">
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-[#5235E8]' : 'text-white/70 group-hover:text-white'}`} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[15px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sync Status Indicator */}
      <div className="px-6 mb-6">
        <SyncStatus />
      </div>

      {/* Upgrade Box (From Design) */}
      <div className="p-6 mt-auto">
        <div className="bg-white rounded-3xl p-6 text-center relative shadow-2xl overflow-visible">
          {/* Rocket illustration placeholder - using pure css/unicode or an icon */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-24 h-24 flex items-center justify-center">
            <div className="relative w-full h-full flex flex-col items-center justify-center animate-bounce">
              <span className="text-6xl drop-shadow-md pb-4">🚀</span>
              <div className="absolute bottom-2 w-16 h-4 bg-gray-200 rounded-[100%] blur-sm opacity-50 z-[-1]"></div>
            </div>
          </div>

          <div className="mt-8 mb-4">
            <h3 className="text-[#1E1B4B] font-bold text-sm mb-1">Want to upgrade</h3>
          </div>
          <button className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-transform hover:scale-105 shadow-md">
            Upgrade now
          </button>
        </div>
      </div>

    </div>
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