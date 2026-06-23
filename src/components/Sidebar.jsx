import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import {
  LayoutDashboard,
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
  ChevronRight,
  Wifi,
  WifiOff,
  Database,
  RefreshCw
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
      <div className="md:hidden bg-[var(--primary-color)] text-white p-4 flex justify-between items-center z-50 flex-shrink-0 shadow-md">
        <div className="flex items-center">
          <span className="text-[29px] drop-shadow-md animate-float inline-block">👑</span>
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
          fixed md:static inset-y-0 right-0 z-50 transform transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0
          w-64 lg:w-[260px]
          bg-[var(--primary-color)] md:bg-transparent text-white flex flex-col h-full md:h-screen flex-shrink-0
          shadow-2xl md:shadow-none overflow-visible
        `}
      >

        {/* TOP PART - Crown Header (Fixed Width) */}
        <div className="w-full md:w-[260px] bg-[var(--primary-color)] md:rounded-br-[2rem] pt-6 px-3 flex-shrink-0 relative z-20 shadow-[5px_5px_15px_rgba(0,0,0,0.1)] transition-all duration-300 pb-2">
          <div className="bg-black/20 rounded-2xl text-center relative shadow-xl overflow-visible border border-white/10 group mb-0"
            style={{ padding: '16px 8px' }}
          >
            {/* Crown */}
            <div className="mb-2">
              <span className="drop-shadow-[0_0_20px_rgba(255,215,0,1)] text-[44px] animate-float inline-block">👑</span>
            </div>
            {/* Text - Always full size now */}
            <div>
              <h1 className="font-black tracking-wider text-white text-lg whitespace-nowrap">
                ELKING PRO V2
              </h1>
              <p className="text-[10px] text-white/70 font-medium block">نظام إدارة متكامل</p>
            </div>
          </div>
        </div>

        {/* MIDDLE PART - Navigation (The moving part) */}
        <div className={`
          w-full md:bg-[var(--primary-color)] flex-1 overflow-hidden flex flex-col py-2
          transition-all duration-300 ease-in-out shadow-[5px_5px_15px_rgba(0,0,0,0.05)] relative z-10
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
                      ? 'bg-gradient-to-r from-white to-gray-50 text-[var(--primary-color)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] scale-[1.02] border border-white/20'
                      : 'text-white/80 hover:bg-white/10 hover:text-white hover:shadow-lg'
                    }
                `}
                >
                  {/* Icon container */}
                  <div className={`flex items-center justify-center shrink-0 w-10 h-10 rounded-xl transition-all duration-300 ${isActive ? 'bg-white shadow-inner' : 'group-hover:bg-white/10'}`}>
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-all duration-300 ${isActive ? 'text-[var(--primary-color)] drop-shadow-md' : 'text-white/70 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}
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
                    ${isActive ? 'font-black tracking-wide text-[var(--primary-color)]' : 'font-semibold tracking-wide'}
                  `}
                  >
                    {item.label}
                  </span>

                  {/* Active indicator dot (when collapsed) */}
                  {isActive && !shouldShowLabels && (
                    <div className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM PART - Admin & Sync Status */}
        <div className="w-full md:w-[260px] bg-[var(--primary-color)] md:rounded-tr-[2rem] px-3 pb-6 pt-4 flex-shrink-0 relative z-20 shadow-[5px_-5px_15px_rgba(0,0,0,0.1)] transition-all duration-300 mt-auto">
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
  const [showModal, setShowModal] = React.useState(false);
  const [failedOps, setFailedOps] = React.useState([]);
  const [pendingOps, setPendingOps] = React.useState([]);

  const updateStatus = React.useCallback(() => {
    setStatus(syncManager.getStatus());
    try {
      setFailedOps(JSON.parse(localStorage.getItem('pos_failed_sync') || '[]'));
      setPendingOps(syncManager.getQueue());
    } catch (_) {}
  }, []);

  React.useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, [updateStatus]);

  const handleRetry = () => {
    soundManager.play('refresh');
    syncManager.retryFailed?.();
    syncManager.processQueue();
    updateStatus();
  };

  const handleClear = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع العمليات الفاشلة؟ لن تتم مزامنتها مع السيرفر.')) {
      soundManager.play('delete');
      syncManager.clearFailed?.();
      updateStatus();
    }
  };

  return (
    <>
      <div 
        onClick={() => { soundManager.play('click'); setShowModal(true); }}
        className="cursor-pointer hover:opacity-90 transition-opacity select-none"
      >
        {status.isOnline && status.pendingCount === 0 && (
          <div className="flex items-center text-xs text-green-300 bg-white/5 p-2.5 rounded-xl border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 ml-2 animate-pulse"></div>
            <span>متصل بالسحابة</span>
          </div>
        )}
        {!status.isOnline && (
          <div className="flex items-center text-xs text-orange-300 bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/20">
            <div className="w-2 h-2 rounded-full bg-orange-500 ml-2"></div>
            <span>وضع الأوفلاين ({status.pendingCount} معلق)</span>
          </div>
        )}
        {status.isOnline && status.pendingCount > 0 && (
          <div className="flex items-center text-xs text-blue-300 bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
            <div className="w-2 h-2 rounded-full bg-blue-500 ml-2 animate-spin"></div>
            <span>مزامنة {status.pendingCount} عناصر...</span>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl text-right text-white animate-slideInRight">
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10 flex-row-reverse">
              <h3 className="text-base md:text-lg font-bold flex items-center gap-2 flex-row-reverse">
                <Database className="h-5 w-5 text-purple-400" />
                <span>حالة المزامنة والاتصال</span>
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Connection Info */}
            <div className="bg-white/5 rounded-xl p-4 mb-5 space-y-3">
              <div className="flex justify-between items-center flex-row-reverse text-sm">
                <span className="text-slate-400 flex items-center gap-1.5 flex-row-reverse">
                  {status.isOnline ? <Wifi className="h-4 w-4 text-green-400" /> : <WifiOff className="h-4 w-4 text-orange-400" />}
                  حالة الإنترنت:
                </span>
                <span className={`font-bold ${status.isOnline ? 'text-green-400' : 'text-orange-400'}`}>
                  {status.isOnline ? 'متصل بالشبكة' : 'غير متصل (أوفلاين)'}
                </span>
              </div>
              <div className="flex justify-between items-center flex-row-reverse text-sm">
                <span className="text-slate-400">العمليات المعلقة في الانتظار:</span>
                <span className="font-bold text-blue-400">{pendingOps.length} عملية</span>
              </div>
              <div className="flex justify-between items-center flex-row-reverse text-sm">
                <span className="text-slate-400">العمليات الفاشلة:</span>
                <span className="font-bold text-red-400">{failedOps.length} عملية</span>
              </div>
            </div>

            {/* Pending Queue List */}
            {pendingOps.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-400 mb-2 mr-1">العمليات المعلقة في الطابور:</h4>
                <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar bg-black/30 p-3 rounded-xl border border-white/5 text-xs text-right">
                  {pendingOps.map(op => (
                    <div key={op.id} className="flex justify-between items-center border-b border-white/5 pb-1.5 last:border-0 last:pb-0 flex-row-reverse">
                      <span className="font-mono text-slate-200">{op.service}.{op.method}</span>
                      <span className="text-slate-500">{new Date(op.timestamp).toLocaleTimeString('ar-EG')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Queue List */}
            {failedOps.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-red-400 mb-2 mr-1">العمليات التي فشلت مزامنتها:</h4>
                <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar bg-red-950/20 p-3 rounded-xl border border-red-500/10 text-xs text-right">
                  {failedOps.map(op => (
                    <div key={op.id} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center flex-row-reverse">
                        <span className="font-bold text-red-400 font-mono">{op.service}.{op.method}</span>
                        <span className="text-slate-500">{new Date(op.failedAt || op.timestamp).toLocaleTimeString('ar-EG')}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 break-all text-right leading-relaxed bg-black/20 p-1.5 rounded">{op.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end mt-6 border-t border-white/10 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-xl font-bold transition-all text-sm cursor-pointer"
              >
                إغلاق
              </button>
              {failedOps.length > 0 && (
                <button
                  onClick={handleClear}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 py-2 px-4 rounded-xl font-bold transition-all text-sm cursor-pointer"
                >
                  مسح الأخطاء
                </button>
              )}
              {status.isOnline && (pendingOps.length > 0 || failedOps.length > 0) && (
                <button
                  onClick={handleRetry}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl font-bold transition-all text-sm shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer flex-row-reverse"
                >
                  <RefreshCw className="h-4 w-4 animate-spin-slow" />
                  <span>إعادة المحاولة فوراً</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;