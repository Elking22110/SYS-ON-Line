import React, { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { NotificationProvider } from "./components/NotificationSystem";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import SupplierDetails from "./pages/SupplierDetails";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import Shifts from "./pages/Shifts";
import UserProfile from "./components/UserProfile";
import LoginForm from "./components/LoginForm"; // Added LoginForm
import TitleBar from "./components/TitleBar"; // Added TitleBar
import { observerManager } from "./utils/observerManager"; // إضافة مدير المراقبين
import { DataValidator, StorageMonitor } from "./utils/dataValidation"; // إضافة نظام التحقق
import DataLoader from "./components/DataLoader"; // إضافة محمل البيانات
import databaseManager from "./utils/database"; // إضافة مدير قاعدة البيانات
import { getCurrentDate, cleanExistingData } from './utils/dateUtils.js';
import { subscribe, EVENTS } from "./utils/observerManager";
import { hashPassword } from './utils/security.js';
import { initTheme } from "./utils/themeUtils";
import supabaseService from "./utils/supabaseService";
import { Toaster } from 'react-hot-toast';

function App() {
  const navigate = useNavigate();

  // تهيئة نظام التحقق من البيانات
  useEffect(() => {
    // تهيئة قاعدة البيانات أولاً
    const initDatabase = async () => {
      try {
        await databaseManager.init();
        await databaseManager.ensureStoresExist();

        // تنظيف البيانات الموجودة من التواريخ الهجرية
        cleanExistingData();
        // تم تهيئة قاعدة البيانات بنجاح
      } catch (error) {
        console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
      }
    };

    // إعادة تعيين المستخدمين الافتراضيين
    const resetUsers = () => {
      const defaultUsers = [
        {
          id: 1,
          name: 'admin',
          email: 'admin@admin.com',
          phone: '01000000000',
          role: 'admin',
          status: 'active',
          password: hashPassword('admin'),
          createdAt: getCurrentDate(),
          lastLogin: getCurrentDate()
        }
      ];

      localStorage.setItem('users', JSON.stringify(defaultUsers));
      // تم إعادة تعيين المستخدمين الافتراضيين
    };

    initDatabase();
    initTheme(); // تهيئة المظهر عند بدء التطبيق
    // لا تُعدِّ ضبط المستخدمين إذا كانت بياناتهم موجودة بالفعل
    try {
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
      if (!Array.isArray(existingUsers) || existingUsers.length === 0) {
        resetUsers();
      } else {
        // تم العثور على مستخدمين محفوظين - لن يتم إعادة تعيينهم
      }
    } catch (e) {
      // في حال كانت البيانات تالفة، نعيد ضبطها مرة واحدة
      console.warn('⚠️ بيانات المستخدمين تالفة - سيتم إعادة تعيينها');
      resetUsers();
    }

    // تهيئة مراقب التخزين
    StorageMonitor.init();

    // التحقق من صحة البيانات عند بدء التطبيق
    const validation = DataValidator.validateStoredData();
    if (!validation.isValid) {
      console.warn('تم اكتشاف مشاكل في البيانات:', validation.errors);
      // محاولة إصلاح البيانات تلقائياً
      const repaired = DataValidator.repairData();
      if (repaired) {
        console.log('تم إصلاح البيانات بنجاح');
      } else {
        console.error('فشل في إصلاح البيانات');
      }
    }

    // إنشاء نسخة احتياطية دورية
    const backupInterval = setInterval(() => {
      DataValidator.createBackup();
    }, 60000); // كل دقيقة

    // تنظيف البيانات القديمة يومياً
    const cleanupInterval = setInterval(() => {
      DataValidator.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // كل 24 ساعة

    return () => {
      clearInterval(backupInterval);
      clearInterval(cleanupInterval);
    };
  }, []);

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (event) => {
      // التحقق من أن المستخدم لا يكتب في حقل نص
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // اختصارات التنقل
      if (event.ctrlKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            navigate('/');
            break;
          case '2':
            event.preventDefault();
            navigate('/pos');
            break;
          case '3':
            event.preventDefault();
            navigate('/products');
            break;
          case '4':
            event.preventDefault();
            navigate('/reports');
            break;
          case '5':
            event.preventDefault();
            navigate('/customers');
            break;
          case '6':
            event.preventDefault();
            navigate('/suppliers');
            break;
          case '7':
            event.preventDefault();
            navigate('/settings');
            break;
          case '8':
            event.preventDefault();
            navigate('/shifts');
            break;
          default:
            break;
        }
      }

      // اختصارات إضافية
      if (event.key === 'F1') {
        event.preventDefault();
        alert('اختصارات لوحة المفاتيح:\n\nCtrl+1: لوحة التحكم\nCtrl+2: نقطة البيع\nCtrl+3: المنتجات\nCtrl+4: التقارير\nCtrl+5: العملاء\nCtrl+6: الموردين\nCtrl+7: الإعدادات\n\nF1: عرض هذه المساعدة');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  // تهيئة مدير المراقبين و Supabase Realtime
  useEffect(() => {
    // إيقاف جميع المراقبين نهائياً (إن وجدوا)
    observerManager.stopAll();

    // بدء مزامنة Supabase اللحظية
    supabaseService.initRealtime();

    return () => {
      supabaseService.stopRealtime();
    };
  }, []);

  // التحديث للمكونات يتم من خلال React تلقائياً عند تغيير السياق أو الـ Observer
  useEffect(() => {
    const onShiftStart = () => { publish(EVENTS.SHIFTS_CHANGED, {}); };
    const onShiftEnd = () => { publish(EVENTS.SHIFTS_CHANGED, {}); };

    window.addEventListener('shiftStarted', onShiftStart);
    window.addEventListener('shiftEnded', onShiftEnd);
    return () => {
      window.removeEventListener('shiftStarted', onShiftStart);
      window.removeEventListener('shiftEnded', onShiftEnd);
    };
  }, [navigate]);

  // تم إزالة التحديث العنيف عبر window.location.reload()
  // المكونات تقوم بتحديث نفسها باستخدام observeManager 
  useEffect(() => {
    // التخزين المحلي عبر التبويبات
    const onStorage = (e) => {
      if (!e || !e.key) return;
      const keys = ['products', 'productCategories', 'customers', 'suppliers', 'sales', 'users', 'pos-settings'];
      if (keys.includes(e.key) || (e.key.startsWith('__evt__:'))) {
        // Data changed in another tab, could trigger a soft sync here if needed
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <>
      <TitleBar />
      <Toaster position="top-right" containerStyle={{ zIndex: 999999 }} />
      <DataLoader>
        <NotificationProvider>
          <AuthProvider>
            <div className="flex flex-1 w-full overflow-hidden bg-[#5235E8]">
              <Sidebar />
              <div className="flex-1 h-full overflow-y-auto overflow-x-hidden min-w-0 max-w-full bg-[#F3F4F9] rounded-l-[2.5rem] shadow-[-5px_0_20px_rgba(0,0,0,0.1)] relative ipad-main-content ipad-pro-main-content">
                <Routes>
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/pos" element={
                    <ProtectedRoute requiredPermission="pos_access">
                      <POS />
                    </ProtectedRoute>
                  } />
                  <Route path="/products" element={
                    <ProtectedRoute requiredPermission="manage_products">
                      <Products />
                    </ProtectedRoute>
                  } />
                  <Route path="/reports" element={
                    <ProtectedRoute requiredPermission="view_reports">
                      <Reports />
                    </ProtectedRoute>
                  } />
                  <Route path="/customers" element={
                    <ProtectedRoute requiredPermission="manage_customers">
                      <Customers />
                    </ProtectedRoute>
                  } />
                  <Route path="/suppliers" element={
                    <ProtectedRoute requiredPermission="manage_customers">
                      <Suppliers />
                    </ProtectedRoute>
                  } />
                  <Route path="/suppliers/:id" element={
                    <ProtectedRoute requiredPermission="manage_customers">
                      <SupplierDetails />
                    </ProtectedRoute>
                  } />
                  <Route path="/shifts" element={
                    <ProtectedRoute requiredPermission="manage_shifts">
                      <Shifts />
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses" element={
                    <ProtectedRoute requiredPermission="view_reports">
                      <Expenses />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute requiredRole="admin">
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  } />
                </Routes>
              </div>
            </div>
          </AuthProvider>
        </NotificationProvider>
      </DataLoader>
    </>
  );
}

export default App;