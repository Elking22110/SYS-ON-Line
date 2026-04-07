import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import LoginForm from './LoginForm';
import { Loader2, Shield, AlertTriangle, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { subscribe, EVENTS } from '../utils/observerManager';

const ProtectedRoute = ({ children, requiredPermission = null, requiredRole = null, requireShift = true }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeShift, setActiveShift] = useState(JSON.parse(localStorage.getItem('activeShift') || 'null'));

  useEffect(() => {
    const handleShiftChange = () => {
      setActiveShift(JSON.parse(localStorage.getItem('activeShift') || 'null'));
    };

    const unsub = subscribe(EVENTS.SHIFTS_CHANGED, handleShiftChange);
    window.addEventListener('storage', handleShiftChange);

    return () => {
      if (unsub) unsub();
      window.removeEventListener('storage', handleShiftChange);
    };
  }, []);

  // عرض شاشة التحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-800 text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن المستخدم مسجل الدخول
  if (!user) {
    return <LoginForm />;
  }

  // التحقق من الصلاحيات المطلوبة (استثناء للمدير العام)
  if (requiredPermission && user.role !== 'admin' && !user.permissions.includes(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="glass-card hover-lift  p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-red-500 bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-4">غير مصرح لك</h2>
          <p className="text-purple-200 mb-6">
            ليس لديك الصلاحية المطلوبة للوصول إلى هذه الصفحة
          </p>
          <div className="text-sm text-purple-300">
            <p>الصلاحية المطلوبة: <span className="font-mono">{requiredPermission}</span></p>
            <p>صلاحياتك الحالية: <span className="font-mono">{user.permissions.join(', ')}</span></p>
          </div>
        </div>
      </div>
    );
  }

  // التحقق من الدور المطلوب (استثناء للمدير العام)
  if (requiredRole && user.role !== 'admin' && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="glass-card hover-lift  p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-red-500 bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-4">غير مصرح لك</h2>
          <p className="text-purple-200 mb-6">
            ليس لديك الدور المطلوب للوصول إلى هذه الصفحة
          </p>
          <div className="text-sm text-purple-300">
            <p>الدور المطلوب: <span className="font-mono">{requiredRole}</span></p>
            <p>دورك الحالي: <span className="font-mono">{user.role}</span></p>
          </div>
        </div>
      </div>
    );
  }

  // التحقق من الوردية إذا كانت الصفحة تتطلب ذلك
  if (requireShift && !activeShift) {
    if (user.role === 'admin') {
      // للمدير، ربما يريد تصفح النظام بلا وردية، لكن بناء على طلباتنا سنحجبه أو نعطيه خيار مباشر
      // هنا سنمنع العمل على المبيعات للمدير بدون وردية لأن المبيعات ستختل.
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 relative z-50">
        <div className="glass-card hover-lift p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-[#5235E8]/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="h-8 w-8 text-[#5235E8]" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">النظام مغلق مؤقتاً</h2>
          <p className="text-slate-600 mb-6 font-medium">
            يجب فتح وردية عمل جديدة لكتابة أو تصفح المبيعات والأوردرات.
          </p>
          
          <button
            onClick={() => navigate('/shifts')}
            className="w-full py-3 mb-3 bg-[#5235E8] hover:bg-[#432bc2] text-white rounded-xl font-bold shadow-lg shadow-[#5235E8]/30 transition-all flex items-center justify-center gap-2"
          >
            الذهاب لشاشة الورديات لفتح وردية
          </button>
        </div>
      </div>
    );
  }

  // إذا كان المستخدم مسجل الدخول ولديه الصلاحيات المطلوبة
  return children;
};

export default ProtectedRoute;
