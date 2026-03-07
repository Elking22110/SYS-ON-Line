import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Printer,
  Globe,
  Database,
  Bell,
  Palette,
  Monitor,
  Smartphone,
  Download,
  Upload,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Store,
  Clock,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Key,
  Mail,
  Phone,
  Filter,
  Cloud,
  X,
  Settings as SettingsIcon,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Lock,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataManager from '../components/DataManager';
import soundManager from '../utils/soundManager.js';
import { hashPassword } from '../utils/security.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import { formatDate, formatTimeOnly, getCurrentDate } from '../utils/dateUtils.js';
import StoreSettings from '../components/StoreSettings';
import ShiftManager from '../components/ShiftManager';
import BackupManager from '../components/BackupManager';
import { applyTheme, applyPrimaryColor, adjustColor } from '../utils/themeUtils';

import supabaseService from '../utils/supabaseService';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('store');

  const loadSettingsFromSupabase = async () => {
    try {
      if (window.supabaseDB) {
        const onlineSettings = await supabaseService.getSettings();
        const posSet = onlineSettings.find(s => s.key === 'pos-settings');
        if (posSet) {
          const parsed = typeof posSet.value === 'string' ? JSON.parse(posSet.value) : posSet.value;
          setSettings(prev => ({ ...prev, ...parsed }));
          localStorage.setItem('pos-settings', JSON.stringify(parsed));
        }

        const exactsToSync = [
          'manufacturing_waste',
          'supplier_supplies',
          'supplier_payments',
          'storeInfo',
          'activity_logs',
          'categoryImages'
        ];
        for (const key of exactsToSync) {
          const s = onlineSettings.find(s => s.key === key);
          if (s) {
            localStorage.setItem(key, typeof s.value === 'string' ? s.value : JSON.stringify(s.value));
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings from Supabase:', error);
    }
  };

  // تطبيق الإعدادات عند تحميل الصفحة
  useEffect(() => {
    loadSettingsFromSupabase();

    // تطبيق المظهر المحفوظ
    if (settings.theme) {
      applyTheme(settings.theme);
    }
    // ...

    // تطبيق اللون الأساسي المحفوظ
    if (settings.primaryColor) {
      applyPrimaryColor(settings.primaryColor);
    }

    // تطبيق طي القائمة الجانبية المحفوظ
    if (settings.sidebarCollapsed !== undefined) {
      applySidebarCollapse(settings.sidebarCollapsed);
    }

    // تطبيق إعدادات الأصوات المحفوظة
    if (settings.soundsEnabled !== undefined) {
      soundManager.setEnabled(settings.soundsEnabled);
    }

    if (settings.soundVolume !== undefined) {
      soundManager.setVolume(settings.soundVolume);
    }
  }, []);
  const [users, setUsers] = useState([]);

  const loadUsersFromSupabase = async () => {
    try {
      if (window.supabaseDB) {
        const onlineUsers = await supabaseService.getUsers();
        if (onlineUsers && onlineUsers.length > 0) {
          const mapped = onlineUsers.map(u => ({
            ...u,
            name: u.username // Map username to name for frontend compatibility
          }));
          setUsers(mapped);
          localStorage.setItem('users', JSON.stringify(mapped));
          return;
        }
      }
      // Fallback
      setUsers(JSON.parse(localStorage.getItem('users') || '[]'));
    } catch (error) {
      console.error('Error loading users from Supabase:', error);
      setUsers(JSON.parse(localStorage.getItem('users') || '[]'));
    }
  };

  useEffect(() => {
    loadUsersFromSupabase();
  }, []);
  const [loading, setLoading] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cashier',
    password: ''
  });
  const [settings, setSettings] = useState(() => {
    const savedSettings = JSON.parse(localStorage.getItem('pos-settings') || '{}');
    const savedStoreInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');

    return {
      // إعدادات عامة
      companyName: savedStoreInfo.storeName || savedSettings.companyName || 'Elking',
      companyAddress: savedStoreInfo.storeAddress || savedSettings.companyAddress || 'باسوس - القناطر الخيرية - الطريق الدائري',
      companyPhone: savedStoreInfo.storePhone || savedSettings.companyPhone || '01029022006',
      companyEmail: savedStoreInfo.storeEmail || savedSettings.companyEmail || 'info@msgroupplast.com',
      currency: savedSettings.currency || 'EGP',
      language: savedSettings.language || 'ar',
      timezone: savedSettings.timezone || 'Africa/Cairo',

      // إعدادات الضرائب
      taxEnabled: savedStoreInfo.taxEnabled !== undefined ? savedStoreInfo.taxEnabled : savedSettings.taxEnabled !== undefined ? savedSettings.taxEnabled : false,
      taxRate: savedStoreInfo.taxRate || savedSettings.taxRate || 15,
      taxName: savedStoreInfo.taxName || savedSettings.taxName || 'ضريبة القيمة المضافة',

      // إعدادات المستخدمين
      allowRegistration: savedSettings.allowRegistration !== undefined ? savedSettings.allowRegistration : true,
      requireEmailVerification: savedSettings.requireEmailVerification !== undefined ? savedSettings.requireEmailVerification : true,
      defaultRole: savedSettings.defaultRole || 'cashier',

      // إعدادات الطابعة
      printerName: savedSettings.printerName || 'EPSON TM-T20III',
      paperSize: savedSettings.paperSize || '80mm',
      printLogo: savedSettings.printLogo !== undefined ? savedSettings.printLogo : true,
      printFooter: savedSettings.printFooter !== undefined ? savedSettings.printFooter : true,

      // إعدادات النسخ الاحتياطي
      autoBackup: savedSettings.autoBackup !== undefined ? savedSettings.autoBackup : true,
      backupFrequency: savedSettings.backupFrequency || 'daily',
      backupLocation: savedSettings.backupLocation || 'local',

      // إعدادات الإشعارات
      emailNotifications: savedSettings.emailNotifications !== undefined ? savedSettings.emailNotifications : true,
      smsNotifications: savedSettings.smsNotifications !== undefined ? savedSettings.smsNotifications : false,
      lowStockAlerts: savedSettings.lowStockAlerts !== undefined ? savedSettings.lowStockAlerts : true,
      salesReports: savedSettings.salesReports !== undefined ? savedSettings.salesReports : true,

      // إعدادات المظهر
      theme: savedSettings.theme || 'light',
      primaryColor: savedSettings.primaryColor || '#8B5CF6',
      sidebarCollapsed: savedSettings.sidebarCollapsed !== undefined ? savedSettings.sidebarCollapsed : false,

      // إعدادات الأصوات
      soundsEnabled: savedSettings.soundsEnabled !== undefined ? savedSettings.soundsEnabled : true,
      soundVolume: savedSettings.soundVolume !== undefined ? savedSettings.soundVolume : 0.7,
      clickSounds: savedSettings.clickSounds !== undefined ? savedSettings.clickSounds : true,
      notificationSounds: savedSettings.notificationSounds !== undefined ? savedSettings.notificationSounds : true,
      systemSounds: savedSettings.systemSounds !== undefined ? savedSettings.systemSounds : true,

      // إعدادات النظام
      maintenanceMode: savedSettings.maintenanceMode !== undefined ? savedSettings.maintenanceMode : false,
      debugMode: savedSettings.debugMode !== undefined ? savedSettings.debugMode : false,
      analyticsEnabled: savedSettings.analyticsEnabled !== undefined ? savedSettings.analyticsEnabled : true,
      // المخزون
      inventoryEnabled: savedStoreInfo.inventoryEnabled !== undefined ? savedStoreInfo.inventoryEnabled : (savedSettings.inventoryEnabled !== undefined ? savedSettings.inventoryEnabled : true)
    };
  });

  const tabs = [
    { id: 'store', name: 'إعدادات المصنع', icon: Store },
    { id: 'shifts', name: 'إدارة الورديات', icon: Clock },
    { id: 'users', name: 'المستخدمين', icon: User },
    { id: 'backup', name: 'النسخ الاحتياطي', icon: Database },
    { id: 'data', name: 'إدارة البيانات', icon: Database },
    { id: 'notifications', name: 'الإشعارات', icon: Bell },
    { id: 'appearance', name: 'المظهر', icon: Palette },
    { id: 'sounds', name: 'الأصوات', icon: Bell },
    { id: 'system', name: 'النظام', icon: Monitor }
  ];

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // تطبيق التغييرات فورياً
    applySettingChange(key, value);
    try { publish(EVENTS.SETTINGS_CHANGED, { key, value }); } catch (_) { }
  };

  // تطبيق التغييرات فورياً على النظام
  const applySettingChange = (key, value) => {
    try {
      // تطبيق تغيير المظهر
      if (key === 'theme') {
        applyTheme(value);
      }

      // تطبيق تغيير اللون الأساسي
      if (key === 'primaryColor') {
        applyPrimaryColor(value);
      }

      // تطبيق تغيير طي القائمة الجانبية
      if (key === 'sidebarCollapsed') {
        applySidebarCollapse(value);
      }

      // تطبيق تغيير الأصوات
      if (key === 'soundsEnabled') {
        soundManager.setEnabled(value);
      }

      if (key === 'soundVolume') {
        soundManager.setVolume(value);
      }

      // حفظ الإعدادات في localStorage فوراً
      const updatedSettings = { ...settings, [key]: value };
      localStorage.setItem('pos-settings', JSON.stringify(updatedSettings));
      // عند تغيير المخزون: احفظ في storeInfo أيضاً لضمان عمل نقطة البيع
      if (key === 'inventoryEnabled') {
        try {
          const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
          const updatedStoreInfo = { ...storeInfo, inventoryEnabled: !!value };
          localStorage.setItem('storeInfo', JSON.stringify(updatedStoreInfo));
        } catch (_) { }
      }

      // إضافة الإعدادات إلى document.documentElement للاستمرارية
      document.documentElement.setAttribute(`data-${key}`, value);

      console.log(`تم تطبيق الإعداد: ${key} = ${value}`);
    } catch (error) {
      console.error('خطأ في تطبيق الإعداد:', error);
    }
  };



  // تطبيق طي القائمة الجانبية
  const applySidebarCollapse = (collapsed) => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      if (collapsed) {
        sidebar.classList.add('collapsed');
      } else {
        sidebar.classList.remove('collapsed');
      }
    }
  };

  // إعادة تعيين المظهر للألوان الأساسية
  const resetAppearanceToDefault = () => {
    try {
      // إعادة تعيين الإعدادات للألوان الأساسية
      const defaultSettings = {
        theme: 'dark',
        primaryColor: '#8B5CF6',
        sidebarCollapsed: false
      };

      // تطبيق الإعدادات الافتراضية
      setSettings(prev => ({
        ...prev,
        ...defaultSettings
      }));

      // تطبيق التغييرات فورياً
      applyTheme(defaultSettings.theme);
      applyPrimaryColor(defaultSettings.primaryColor);
      applySidebarCollapse(defaultSettings.sidebarCollapsed);

      // حفظ الإعدادات في localStorage
      const updatedSettings = { ...settings, ...defaultSettings };
      localStorage.setItem('system-settings', JSON.stringify(updatedSettings));

      // إضافة الإعدادات إلى document.documentElement
      document.documentElement.setAttribute('data-theme', defaultSettings.theme);
      document.documentElement.setAttribute('data-primaryColor', defaultSettings.primaryColor);
      document.documentElement.setAttribute('data-sidebarCollapsed', defaultSettings.sidebarCollapsed);

      // إزالة جميع الألوان المخصصة
      const root = document.documentElement;
      root.style.removeProperty('--primary-color');
      root.style.removeProperty('--primary-500');

      // إعادة تعيين العناصر للألوان الأساسية
      const primaryElements = document.querySelectorAll('[style*="background-color"], [style*="color"], [style*="border-color"]');
      primaryElements.forEach(element => {
        element.style.removeProperty('background-color');
        element.style.removeProperty('color');
        element.style.removeProperty('border-color');
      });

      soundManager.play('success');
      toast.success('تم إعادة تعيين المظهر للألوان الأساسية بنجاح!');

      console.log('تم إعادة تعيين المظهر للألوان الأساسية');
    } catch (error) {
      console.error('خطأ في إعادة تعيين المظهر:', error);
      soundManager.play('error');
      toast.error('حدث خطأ في إعادة تعيين المظهر!');
    }
  };

  // دوال إدارة المستخدمين
  const addUser = async () => {
    // التحقق من صحة البيانات
    if (!newUser.name || !newUser.phone || !newUser.password) {
      soundManager.play('error');
      toast.error('يرجى ملء الحقول المطلوبة (الاسم، الهاتف، كلمة المرور)');
      return;
    }

    // التحقق من صحة البريد الإلكتروني (فقط إذا تم إدخاله)
    if (newUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUser.email)) {
        soundManager.play('error');
        toast.error('يرجى إدخال بريد إلكتروني صحيح');
        return;
      }
    }

    // التحقق من صحة رقم الهاتف
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(newUser.phone.replace(/\s/g, ''))) {
      soundManager.play('error');
      toast.error('يرجى إدخال رقم هاتف صحيح (10-15 رقم)');
      return;
    }

    // التحقق من قوة كلمة المرور
    if (newUser.password.length < 6) {
      soundManager.play('error');
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    // التحقق من عدم تكرار البريد الإلكتروني
    if (newUser.email) {
      const emailExists = users.some(user => user.email && user.email.toLowerCase() === newUser.email.toLowerCase());
      if (emailExists) {
        soundManager.play('error');
        toast.error('البريد الإلكتروني مستخدم بالفعل');
        return;
      }
    }

    // التحقق من عدم تكرار اسم المستخدم
    const nameExists = users.some(user => user.name.toLowerCase() === newUser.name.toLowerCase());
    if (nameExists) {
      soundManager.play('error');
      toast.error('اسم المستخدم مستخدم بالفعل');
      return;
    }

    const userToSave = {
      username: newUser.name,
      password: hashPassword(newUser.password), // Use hashPassword from security.js
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      status: 'active'
    };

    try {
      if (window.supabaseDB) {
        await supabaseService.addUser(userToSave);
      }

      const userForState = {
        ...userToSave,
        id: Date.now(),
        name: userToSave.username,
        createdAt: getCurrentDate()
      };

      const updatedUsers = [...users, userForState];
      setUsers(updatedUsers);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      setNewUser({ name: '', email: '', phone: '', role: 'cashier', password: '' });
      setShowAddUserModal(false);
      soundManager.play('save');
      toast.success('تم إضافة المستخدم بنجاح!');
    } catch (error) {
      console.error('Error adding user to Supabase:', error);
      toast.error('خطأ في إضافة المستخدم لسوبا بيز');
    }
  };

  const editUser = () => {
    // التحقق من صحة البيانات
    if (!editingUser.name || !editingUser.phone) {
      soundManager.play('error');
      toast.error('يرجى ملء الحقول المطلوبة (الاسم والهاتف)');
      return;
    }

    // التحقق من صحة البريد الإلكتروني (فقط إذا تم إدخاله)
    if (editingUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editingUser.email)) {
        soundManager.play('error');
        toast.error('يرجى إدخال بريد إلكتروني صحيح');
        return;
      }
    }

    // التحقق من صحة رقم الهاتف
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(editingUser.phone.replace(/\s/g, ''))) {
      soundManager.play('error');
      toast.error('يرجى إدخال رقم هاتف صحيح (10-15 رقم)');
      return;
    }

    // منع تغيير دور المستخدم admin
    if (editingUser.name === 'admin' && editingUser.role !== 'admin') {
      soundManager.play('error');
      toast.error('لا يمكن تغيير دور المستخدم الرئيسي (admin)!');
      return;
    }

    // التحقق من عدم تكرار البريد الإلكتروني (باستثناء المستخدم الحالي)
    if (editingUser.email) {
      const emailExists = users.some(user =>
        user.email && user.email.toLowerCase() === editingUser.email.toLowerCase() && user.id !== editingUser.id
      );
      if (emailExists) {
        soundManager.play('error');
        toast.error('البريد الإلكتروني مستخدم بالفعل من قبل مستخدم آخر');
        return;
      }
    }

    // التحقق من عدم تكرار اسم المستخدم (باستثناء المستخدم الحالي)
    const nameExists = users.some(user =>
      user.name.toLowerCase() === editingUser.name.toLowerCase() && user.id !== editingUser.id
    );
    if (nameExists) {
      soundManager.play('error');
      toast.error('اسم المستخدم مستخدم بالفعل من قبل مستخدم آخر');
      return;
    }

    // التحقق من كلمة المرور الجديدة إذا تم إدخالها
    if (editingUser.newPassword && editingUser.newPassword.length < 6) {
      soundManager.play('error');
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    // إنشاء المستخدم المحدث
    const updatedUser = {
      ...editingUser,
      // تحديث كلمة المرور إذا تم إدخال كلمة جديدة
      password: editingUser.newPassword ? btoa(editingUser.newPassword) : editingUser.password,
      // إزالة newPassword من البيانات المحفوظة
      newPassword: undefined
    };

    const updatedUsers = users.map(user =>
      user.id === editingUser.id ? updatedUser : user
    );

    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setShowEditUserModal(false);
    setEditingUser(null);
    soundManager.play('save');
    toast.success('تم تحديث المستخدم بنجاح!');
  };

  const deleteUser = (userId) => {
    const userToDelete = users.find(user => user.id === userId);

    // منع حذف المستخدم admin
    if (userToDelete && userToDelete.name === 'admin' && userToDelete.role === 'admin') {
      soundManager.play('error');
      toast.error('لا يمكن حذف المستخدم الرئيسي (admin)!');
      return;
    }

    // التحقق من وجود مستخدمين آخرين
    const activeUsers = users.filter(user => user.status === 'active' && user.id !== userId);
    if (activeUsers.length === 0) {
      soundManager.play('error');
      toast.error('لا يمكن حذف آخر مستخدم نشط في النظام!');
      return;
    }

    const confirmMessage = `هل أنت متأكد من حذف المستخدم "${userToDelete?.name}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`;
    if (window.confirm(confirmMessage)) {
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      soundManager.play('delete');
      toast.success('تم حذف المستخدم بنجاح!');
    }
  };

  const toggleUserStatus = (userId) => {
    const userToToggle = users.find(user => user.id === userId);

    // منع إلغاء تفعيل المستخدم admin
    if (userToToggle && userToToggle.name === 'admin' && userToToggle.role === 'admin') {
      soundManager.play('error');
      toast.error('لا يمكن إلغاء تفعيل المستخدم الرئيسي (admin)!');
      return;
    }

    // التحقق من وجود مستخدمين نشطين آخرين عند إلغاء التفعيل
    if (userToToggle.status === 'active') {
      const activeUsers = users.filter(user => user.status === 'active' && user.id !== userId);
      if (activeUsers.length === 0) {
        soundManager.play('error');
        toast.error('لا يمكن إلغاء تفعيل آخر مستخدم نشط في النظام!');
        return;
      }
    }

    const updatedUsers = users.map(user =>
      user.id === userId
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    );

    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    soundManager.play('update');
  };

  const openEditModal = (user) => {
    setEditingUser({ ...user });
    setShowEditUserModal(true);
  };

  // إعادة تعيين المستخدمين الافتراضيين
  const resetToDefaultUsers = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين جميع المستخدمين إلى الافتراضيين؟\n\nسيتم حذف جميع المستخدمين الحاليين!')) {
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
          lastLogin: new Date().toISOString()
        }
      ];

      setUsers(defaultUsers);
      localStorage.setItem('users', JSON.stringify(defaultUsers));
      soundManager.play('save');
      toast.success('تم إعادة تعيين المستخدمين بنجاح!');
    }
  };

  // ضمان وجود المستخدم admin دائماً
  const ensureAdminUser = () => {
    const adminExists = users.some(user => user.name === 'admin' && user.role === 'admin');
    if (!adminExists) {
      const adminUser = {
        id: 1,
        name: 'admin',
        email: 'admin@admin.com',
        phone: '01000000000',
        role: 'admin',
        status: 'active',
        password: hashPassword('admin'),
        createdAt: getCurrentDate(),
        lastLogin: getCurrentDate()
      };
      setUsers([adminUser, ...users]);
      localStorage.setItem('users', JSON.stringify([adminUser, ...users]));
    }
  };

  // مسح جميع المستخدمين وإعادة تعيين الافتراضيين
  const clearAndResetUsers = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع المستخدمين وإعادة تعيين النظام؟\n\nسيتم حذف جميع المستخدمين الحاليين وإعادة إنشاء المستخدمين الافتراضيين!')) {
      // مسح localStorage
      localStorage.removeItem('users');

      // إعادة تعيين المستخدمين
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
          lastLogin: new Date().toISOString()
        }
      ];

      setUsers(defaultUsers);
      localStorage.setItem('users', JSON.stringify(defaultUsers));
      soundManager.play('save');
      toast.success('تم مسح وإعادة تعيين جميع المستخدمين بنجاح!\n\nيمكنك الآن تسجيل الدخول بالمستخدمين الجدد.');
    }
  };

  // تشغيل الدالة عند تحميل المكون
  React.useEffect(() => {
    // حفظ المستخدمين الافتراضيين في localStorage إذا لم تكن موجودة
    const savedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    if (savedUsers.length === 0) {
      localStorage.setItem('users', JSON.stringify(users));
    }
    ensureAdminUser();
  }, []);

  const runMigration = async () => {
    if (!window.confirm('هل تريد رفع كافة البيانات المحلية إلى السحابة؟ (سيتم رفع المنتجات، العملاء، النوبات، المبيعات، المصاريف، الموردين، الإعدادات، والمستخدمين)')) return;

    setLoading(true);
    const migToast = toast.loading('جاري المزامنة... يرجى الانتظار حتى اكتمال كافة البيانات', { duration: 0 });
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    const safeSyncItem = async (label, fn) => {
      try {
        await fn();
        successCount++;
      } catch (err) {
        errorCount++;
        errors.push(`${label}: ${err.message || JSON.stringify(err)}`);
        console.error(`Migration error [${label}]:`, err);
      }
    };

    try {
      // 1. Products
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      for (const p of products) {
        await safeSyncItem(`Product: ${p.name || p.id}`, () => supabaseService.addProduct(p));
      }

      // 1.5. Categories
      const categories = JSON.parse(localStorage.getItem('categories') || '[]');
      for (const cat of categories) {
        const catName = typeof cat === 'string' ? cat : cat.name;
        const catDesc = typeof cat === 'string' ? '' : (cat.description || '');
        await safeSyncItem(`Category: ${catName}`, () => supabaseService.addCategory(catName, catDesc));
      }

      // 2. Customers
      const customers = JSON.parse(localStorage.getItem('customers') || '[]');
      for (const c of customers) {
        await safeSyncItem(`Customer: ${c.name || c.id}`, () => supabaseService.addCustomer(c));
      }

      // 2.5 Shifts
      const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');
      for (const sh of shifts) {
        await safeSyncItem(`Shift: ${sh.id}`, () => supabaseService.startShift(sh));
      }

      // 3. Sales
      const sales = JSON.parse(localStorage.getItem('sales') || '[]');
      for (const s of sales) {
        await safeSyncItem(`Sale: ${s.id}`, () => supabaseService.createSale(s));
      }

      // 4. Expenses
      const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      for (const e of expenses) {
        await safeSyncItem(`Expense: ${e.id}`, () => supabaseService.addExpense(e));
      }

      // 5. Suppliers
      const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
      for (const s of suppliers) {
        await safeSyncItem(`Supplier: ${s.name || s.id}`, () => supabaseService.addSupplier(s));
      }

      // 6. Users
      const usersToSync = JSON.parse(localStorage.getItem('users') || '[]');
      for (const u of usersToSync) {
        const userSyncPayload = { ...u };
        if (typeof userSyncPayload.id === 'number') userSyncPayload.id = userSyncPayload.id.toString();
        await safeSyncItem(`User: ${u.name || u.username}`, () => supabaseService.addUser(userSyncPayload));
      }

      // 7. Settings
      const settingsToSync = JSON.parse(localStorage.getItem('pos-settings') || '{}');
      if (Object.keys(settingsToSync).length > 0) {
        await safeSyncItem('Settings: pos-settings', () => supabaseService.updateSetting('pos-settings', settingsToSync));
      }

      // 8. Other Important JSON Collections (Wastage, Logs, Supplier Details)
      const exactsToSync = [
        'manufacturing_waste',
        'supplier_supplies',
        'supplier_payments',
        'storeInfo',
        'activity_logs',
        'categoryImages'
      ];
      for (const key of exactsToSync) {
        const localData = localStorage.getItem(key);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            await safeSyncItem(`Setting: ${key}`, () => supabaseService.updateSetting(key, parsed));
          } catch (_) { /* skip unparsable */ }
        }
      }

      toast.dismiss(migToast);
      if (errorCount === 0) {
        toast.success(`تمت المزامنة الكاملة بنجاح! (${successCount} عنصر)`);
      } else {
        toast.success(`تمت المزامنة: ${successCount} نجحت، ${errorCount} فشلت`, { duration: 6000 });
        console.error('Migration errors summary:', errors);
      }
    } catch (error) {
      toast.dismiss(migToast);
      console.error('Migration critical error:', error);
      toast.error(`حدث خطأ أثناء المزامنة: ${error.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      // حفظ الإعدادات العامة محلياً
      localStorage.setItem('pos-settings', JSON.stringify(settings));

      // مزامنة مع Supabase
      if (window.supabaseDB) {
        await supabaseService.updateSetting('pos-settings', settings);
        console.log('✅ تم حفظ الإعدادات في سوبا بيز');
      }

      try { publish(EVENTS.SETTINGS_CHANGED, { type: 'save_all', settings }); } catch (_) { }

      // إرسال إشارة لحفظ إعدادات المتجر
      const evt = new Event('save-store-settings');
      window.dispatchEvent(evt);

      toast.success('تم حفظ الإعدادات بنجاح!');
    } catch (error) {
      console.error('خطأ في حفظ الإعدادات:', error);
      toast.error('حدث خطأ في حفظ الإعدادات!');
    }
  };

  const resetSettings = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات؟')) {
      const defaultSettings = {
        companyName: 'Elking',
        companyAddress: 'باسوس - القناطر الخيرية - الطريق الدائري',
        companyPhone: '01029022006',
        companyEmail: 'info@msgroupplast.com',
        currency: 'EGP',
        language: 'ar',
        timezone: 'Africa/Cairo',
        allowRegistration: true,
        requireEmailVerification: true,
        defaultRole: 'cashier',
        printerName: 'EPSON TM-T20III',
        paperSize: '80mm',
        printLogo: true,
        printFooter: true,
        autoBackup: true,
        backupFrequency: 'daily',
        backupLocation: 'local',
        emailNotifications: true,
        smsNotifications: false,
        lowStockAlerts: true,
        salesReports: true,
        theme: 'light',
        primaryColor: '#8B5CF6',
        sidebarCollapsed: false,
        maintenanceMode: false,
        debugMode: false,
        analyticsEnabled: true
      };
      setSettings(defaultSettings);
      toast.error('تم إعادة تعيين الإعدادات!');
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'pos-settings.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importSettings = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result);
          setSettings(importedSettings);
          toast.success('تم استيراد الإعدادات بنجاح!');
        } catch (error) {
          toast.error('خطأ في ملف الإعدادات!');
        }
      };
      reader.readAsText(file);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">اسم الشركة</label>
          <input
            type="text"
            value={settings.companyName}
            onChange={(e) => handleSettingChange('companyName', e.target.value)}
            className="input-modern w-full px-3 py-2 text-right"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">هاتف الشركة</label>
          <input
            type="tel"
            value={settings.companyPhone}
            onChange={(e) => handleSettingChange('companyPhone', e.target.value)}
            className="input-modern w-full px-3 py-2 text-right"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">عنوان الشركة</label>
        <textarea
          value={settings.companyAddress}
          onChange={(e) => handleSettingChange('companyAddress', e.target.value)}
          rows={3}
          className="input-modern w-full px-3 py-2 text-right"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">العملة</label>
          <select
            value={settings.currency}
            onChange={(e) => handleSettingChange('currency', e.target.value)}
            className="input-modern w-full px-3 py-2 text-right"
          >
            <option value="EGP">جنيه مصري (EGP)</option>
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="USD">دولار أمريكي (USD)</option>
            <option value="EUR">يورو (EUR)</option>
            <option value="AED">درهم إماراتي (AED)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">اللغة</label>
          <select
            value={settings.language}
            onChange={(e) => handleSettingChange('language', e.target.value)}
            className="input-modern w-full px-3 py-2 text-right"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">المنطقة الزمنية</label>
          <select
            value={settings.timezone}
            onChange={(e) => handleSettingChange('timezone', e.target.value)}
            className="input-modern w-full px-3 py-2 text-right"
          >
            <option value="Africa/Cairo">القاهرة (GMT+2)</option>
            <option value="Asia/Riyadh">الرياض (GMT+3)</option>
            <option value="Asia/Dubai">دبي (GMT+4)</option>
            <option value="Europe/London">لندن (GMT+0)</option>
            <option value="America/New_York">نيويورك (GMT-5)</option>
          </select>
        </div>
      </div>
    </div>
  );


  const renderPrinterSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">اسم الطابعة</label>
        <input
          type="text"
          value={settings.printerName}
          onChange={(e) => handleSettingChange('printerName', e.target.value)}
          className="input-modern w-full px-3 py-2 text-right"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">حجم الورق</label>
          <select
            value={settings.paperSize}
            onChange={(e) => handleSettingChange('paperSize', e.target.value)}
            className="input-modern w-full px-3 py-2 text-right"
          >
            <option value="80mm">80 مم</option>
            <option value="58mm">58 مم</option>
            <option value="A4">A4</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
          <div>
            <h4 className="font-medium text-slate-800">طباعة الشعار</h4>
            <p className="text-sm text-slate-600">طباعة شعار الشركة على الإيصالات</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.printLogo}
              onChange={(e) => handleSettingChange('printLogo', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
          <div>
            <h4 className="font-medium text-slate-800">طباعة التذييل</h4>
            <p className="text-sm text-slate-600">طباعة معلومات إضافية في أسفل الإيصال</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.printFooter}
              onChange={(e) => handleSettingChange('printFooter', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderUserSettings = () => {
    const activeUsers = users.filter(user => user.status === 'active').length;
    const inactiveUsers = users.filter(user => user.status === 'inactive').length;
    const adminUsers = users.filter(user => user.role === 'admin').length;
    const managerUsers = users.filter(user => user.role === 'manager').length;
    const cashierUsers = users.filter(user => user.role === 'cashier').length;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">إدارة المستخدمين</h2>
          <div className="flex space-x-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundManager.play('delete');
                clearAndResetUsers();
              }}
              className="bg-red-600 bg-opacity-20 text-slate-800 px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center border border-red-500 border-opacity-30 min-h-[40px] cursor-pointer"
              style={{
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative'
              }}
              title="مسح جميع المستخدمين وإعادة تعيين النظام"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              مسح وإعادة تعيين
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundManager.play('refresh');
                resetToDefaultUsers();
              }}
              className="bg-orange-600 bg-opacity-20 text-slate-800 px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center border border-orange-500 border-opacity-30 min-h-[40px] cursor-pointer"
              style={{
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative'
              }}
              title="إعادة تعيين المستخدمين الافتراضيين"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة تعيين
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundManager.play('openWindow');
                setShowAddUserModal(true);
              }}
              className="btn-primary w-full shadow-glow px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center border border-green-500 border-opacity-30 min-h-[40px] cursor-pointer text-white"
              style={{
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة مستخدم
            </button>
          </div>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{users.length}</div>
            <div className="text-sm text-slate-600">إجمالي المستخدمين</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{activeUsers}</div>
            <div className="text-sm text-slate-600">نشط</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{inactiveUsers}</div>
            <div className="text-sm text-slate-600">غير نشط</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{managerUsers}</div>
            <div className="text-sm text-slate-600">مدير</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{cashierUsers}</div>
            <div className="text-sm text-slate-600">كاشير</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white bg-opacity-10">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">المستخدم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">الهاتف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">الدور</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">آخر دخول</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white divide-opacity-10">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white hover:bg-opacity-5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${user.name === 'admin' && user.role === 'admin'
                            ? 'bg-gradient-to-r from-red-500 to-pink-500'
                            : 'bg-gradient-to-r from-purple-500 to-blue-500'
                            }`}>
                            <User className="h-5 w-5 text-slate-800" />
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className={`text-sm font-medium ${user.name === 'admin' && user.role === 'admin'
                            ? 'text-red-300 font-bold'
                            : 'text-slate-800'
                            }`}>
                            {user.name}
                            {user.name === 'admin' && user.role === 'admin' && (
                              <span className="ml-2 text-xs bg-red-500 bg-opacity-30 px-2 py-1 rounded-full">رئيسي</span>
                            )}
                          </div>
                          <div className="text-sm text-slate-600">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-slate-600 mr-2" />
                        <div className="text-sm text-slate-800">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-slate-600 mr-2" />
                        <div className="text-sm text-slate-800">{user.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin'
                        ? 'bg-red-100 text-red-800'
                        : user.role === 'manager'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                        }`}>
                        {user.role === 'admin' ? 'مدير عام' : user.role === 'manager' ? 'مدير متجر' : 'كاشير'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          soundManager.play('update');
                          toggleUserStatus(user.id);
                        }}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-all duration-200 min-h-[30px] cursor-pointer ${user.status === 'active'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        style={{
                          pointerEvents: 'auto',
                          zIndex: 10,
                          position: 'relative'
                        }}
                      >
                        {user.status === 'active' ? 'نشط' : 'غير نشط'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'لم يسجل دخول'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {!(user.name === 'admin' && user.role === 'admin') ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                soundManager.play('update');
                                openEditModal(user);
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-all duration-200 p-2 hover:bg-blue-500 hover:bg-opacity-20 rounded-lg min-w-[35px] min-h-[35px] flex items-center justify-center cursor-pointer"
                              title="تعديل"
                              style={{
                                pointerEvents: 'auto',
                                zIndex: 10,
                                position: 'relative'
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                soundManager.play('delete');
                                deleteUser(user.id);
                              }}
                              className="text-red-400 hover:text-red-300 transition-all duration-200 p-2 hover:bg-red-500 hover:bg-opacity-20 rounded-lg min-w-[35px] min-h-[35px] flex items-center justify-center cursor-pointer"
                              title="حذف"
                              style={{
                                pointerEvents: 'auto',
                                zIndex: 10,
                                position: 'relative'
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-500 text-xs">مستخدم محمي</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  const renderBackupSettings = () => (
    <BackupManager />
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-800">إشعارات البريد الإلكتروني</h4>
          <p className="text-sm text-slate-600">إرسال إشعارات عبر البريد الإلكتروني</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.emailNotifications}
            onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-800">إشعارات الرسائل النصية</h4>
          <p className="text-sm text-slate-600">إرسال إشعارات عبر الرسائل النصية</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.smsNotifications}
            onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-800">تنبيهات المخزون المنخفض</h4>
          <p className="text-sm text-slate-600">إشعار عند انخفاض مخزون المنتجات</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.lowStockAlerts}
            onChange={(e) => handleSettingChange('lowStockAlerts', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-800">تقارير المبيعات</h4>
          <p className="text-sm text-slate-600">إرسال تقارير المبيعات الدورية</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.salesReports}
            onChange={(e) => handleSettingChange('salesReports', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">المظهر</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { soundManager.play('click'); handleSettingChange('theme', 'light'); }}
            className={`p-4 rounded-lg border-2 flex flex-col items-center ${settings.theme === 'light'
              ? 'border-purple-500 bg-purple-500 bg-opacity-20 text-purple-300'
              : 'border-white border-opacity-20 bg-white bg-opacity-10 text-slate-800 hover:bg-opacity-20'
              }`}
          >
            <Monitor className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">فاتح</span>
          </button>
          <button
            onClick={() => { soundManager.play('click'); handleSettingChange('theme', 'dark'); }}
            className={`p-4 rounded-lg border-2 flex flex-col items-center ${settings.theme === 'dark'
              ? 'border-purple-500 bg-purple-500 bg-opacity-20 text-purple-300'
              : 'border-white border-opacity-20 bg-white bg-opacity-10 text-slate-800 hover:bg-opacity-20'
              }`}
          >
            <Monitor className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">داكن</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">اللون الأساسي</label>
        <div className="flex space-x-3 mb-4">
          {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'].map(color => (
            <button
              key={color}
              onClick={() => { soundManager.play('click'); handleSettingChange('primaryColor', color); }}
              className={`w-12 h-12 rounded-lg border-2 ${settings.primaryColor === color ? 'border-white' : 'border-white border-opacity-30'
                }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* زر إعادة تعيين المظهر */}
        <button
          onClick={() => {
            soundManager.play('click');
            resetAppearanceToDefault();
          }}
          className="w-full p-3 bg-gray-600 bg-opacity-20 hover:bg-opacity-30 text-slate-800 rounded-lg border border-gray-500 border-opacity-30 flex items-center justify-center space-x-2 transition-all duration-200"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm font-medium">إعادة تعيين المظهر للألوان الأساسية</span>
        </button>
      </div>

      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-800">طي القائمة الجانبية</h4>
          <p className="text-sm text-slate-600">إخفاء القائمة الجانبية افتراضياً</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.sidebarCollapsed}
            onChange={(e) => handleSettingChange('sidebarCollapsed', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>
    </div>
  );

  const renderSoundSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-800">تفعيل الأصوات</h4>
          <p className="text-sm text-slate-600">تشغيل الأصوات في جميع العمليات</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.soundsEnabled}
            onChange={(e) => { soundManager.play('click'); handleSettingChange('soundsEnabled', e.target.checked); }}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      {settings.soundsEnabled && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              مستوى الصوت: {Math.round(settings.soundVolume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.soundVolume}
              onChange={(e) => { soundManager.play('click'); handleSettingChange('soundVolume', parseFloat(e.target.value)); }}
              className="w-full h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
            <div>
              <h4 className="font-medium text-slate-800">أصوات النقر</h4>
              <p className="text-sm text-slate-600">أصوات النقر على الأزرار والحقول</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.clickSounds}
                onChange={(e) => { soundManager.play('click'); handleSettingChange('clickSounds', e.target.checked); }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
            <div>
              <h4 className="font-medium text-slate-800">أصوات الإشعارات</h4>
              <p className="text-sm text-slate-600">أصوات النجاح والخطأ والإشعارات</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationSounds}
                onChange={(e) => { soundManager.play('click'); handleSettingChange('notificationSounds', e.target.checked); }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
            <div>
              <h4 className="font-medium text-slate-800">أصوات النظام</h4>
              <p className="text-sm text-slate-600">أصوات بدء وإنهاء الورديات والعمليات</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.systemSounds}
                onChange={(e) => { soundManager.play('click'); handleSettingChange('systemSounds', e.target.checked); }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="p-4 bg-blue-500 bg-opacity-20 rounded-lg border border-blue-500 border-opacity-30">
            <h4 className="font-medium text-blue-300 mb-2">🎵 اختبار الأصوات</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => soundManager.play('click')}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-slate-800 rounded text-sm"
              >
                نقر
              </button>
              <button
                onClick={() => soundManager.play('success')}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-slate-800 rounded text-sm"
              >
                نجاح
              </button>
              <button
                onClick={() => soundManager.play('error')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-slate-800 rounded text-sm"
              >
                خطأ
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-800">تفعيل إدارة المخزون</h4>
          <p className="text-sm text-slate-600">عند الإلغاء يمكن البيع دون قيود المخزون</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.inventoryEnabled}
            onChange={(e) => handleSettingChange('inventoryEnabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>
      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-800">وضع الصيانة</h4>
          <p className="text-sm text-slate-600">إيقاف النظام مؤقتاً للصيانة</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-800">وضع التطوير</h4>
          <p className="text-sm text-slate-600">عرض معلومات إضافية للمطورين</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.debugMode}
            onChange={(e) => handleSettingChange('debugMode', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-800">التحليلات</h4>
          <p className="text-sm text-slate-600">جمع بيانات الاستخدام لتحسين النظام</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.analyticsEnabled}
            onChange={(e) => handleSettingChange('analyticsEnabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-white bg-opacity-20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-300 mr-2" />
          <div>
            <h4 className="font-medium text-yellow-200">تنبيه مهم</h4>
            <p className="text-sm text-yellow-300 mt-1">
              تغيير هذه الإعدادات قد يؤثر على أداء النظام. تأكد من فهمك للعواقب قبل التغيير.
            </p>
          </div>
        </div>
      </div>
    </div>
  );


  const renderTabContent = () => {
    switch (activeTab) {
      case 'store': return <StoreSettings />;
      case 'shifts': return <ShiftManager />;
      case 'users': return renderUserSettings();
      case 'backup': return renderBackupSettings();
      case 'data': return <DataManager />;
      case 'notifications': return renderNotificationSettings();
      case 'appearance': return renderAppearanceSettings();
      case 'sounds': return renderSoundSettings();
      case 'system': return renderSystemSettings();
      default: return <StoreSettings />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-40 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center  space-y-4 md:space-y-0">
          <div className="flex-1">
            <h1 className="text-sm md:text-base lg:text-lg xl:text-xl font-bold text-slate-900 mb-2 md:mb-3">
              الإعدادات
            </h1>
            <p className="text-slate-600 text-xs md:text-xs lg:text-sm xl:text-sm font-medium">إدارة إعدادات مصنع Elking Plast</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundManager.play('save');
                saveSettings();
              }}
              className="btn-primary flex items-center px-3 md:px-4 py-2 md:py-3 text-xs md:text-xs lg:text-sm font-semibold min-h-[40px] cursor-pointer"
              style={{
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <Save className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              حفظ الإعدادات
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Tabs */}
          <div className="lg:col-span-1">
            <div className="glass-card hover-lift  p-4" style={{ animationDelay: '0.1s' }}>
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        soundManager.play('click');
                        setActiveTab(tab.id);
                      }}
                      className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 min-h-[50px] cursor-pointer ${activeTab === tab.id
                        ? 'bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30'
                        : 'text-slate-800 hover:bg-white hover:bg-opacity-10'
                        }`}
                      style={{
                        pointerEvents: 'auto',
                        zIndex: 10,
                        position: 'relative'
                      }}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      <span className="font-medium">{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Import/Export */}
            <div className="glass-card hover-lift  p-4 mt-4 md:mt-6" style={{ animationDelay: '0.2s' }}>
              <h3 className="font-bold text-white mb-4">إدارة الإعدادات</h3>
              <div className="space-y-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soundManager.play('save');
                    exportSettings();
                  }}
                  className="w-full btn-primary w-full shadow-glow px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center border border-blue-500 border-opacity-30 min-h-[40px] cursor-pointer text-white"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  تصدير الإعدادات
                </button>
                <label className="w-full btn-primary w-full shadow-glow px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center cursor-pointer border border-green-500 border-opacity-30 min-h-[40px] text-white"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  استيراد الإعدادات
                  <input
                    type="file"
                    accept=".json"
                    onChange={importSettings}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soundManager.play('warning');
                    resetSettings();
                  }}
                  className="w-full bg-red-600 bg-opacity-20 text-slate-800 px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center border border-red-500 border-opacity-30 min-h-[40px] cursor-pointer"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  إعادة تعيين
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soundManager.play('save');
                    runMigration();
                  }}
                  className="w-full bg-purple-600 bg-opacity-20 text-slate-800 px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center border border-purple-500 border-opacity-30 min-h-[40px] cursor-pointer mt-2"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  مزامنة السحابة (رفع البيانات)
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="glass-card hover-lift  p-4 md:p-6" style={{ animationDelay: '0.3s' }}>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal - خارج الكارد الرئيسي تماماً */}
      {showAddUserModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
          onClick={(e) => {
            if (false /* Prevent closing on backdrop click */) {
              soundManager.play('closeWindow');
              setShowAddUserModal(false);
            }
          }}
        >
          <div
            className="glass-card p-6 w-full max-w-md mx-4 "
            style={{
              position: 'relative',
              zIndex: 10000,
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">إضافة مستخدم جديد</h3>
              <button
                onClick={() => { soundManager.play('closeWindow'); setShowAddUserModal(false); }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">الاسم</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                  placeholder="اسم المستخدم"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                  placeholder="example@store.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">الهاتف</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                  placeholder="01234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                  placeholder="كلمة المرور (6 أحرف على الأقل)"
                />
                {newUser.password && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${newUser.password.length < 6
                            ? 'bg-red-500 w-1/3'
                            : newUser.password.length < 8
                              ? 'bg-yellow-500 w-2/3'
                              : 'bg-green-500 w-full'
                            }`}
                        ></div>
                      </div>
                      <span className={`text-xs ${newUser.password.length < 6
                        ? 'text-red-400'
                        : newUser.password.length < 8
                          ? 'text-yellow-400'
                          : 'text-green-400'
                        }`}>
                        {newUser.password.length < 6
                          ? 'ضعيفة'
                          : newUser.password.length < 8
                            ? 'متوسطة'
                            : 'قوية'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">الدور</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right appearance-none"
                >
                  <option value="cashier">كاشير</option>
                  <option value="manager">مدير متجر</option>
                  <option value="admin">مدير عام</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { soundManager.play('closeWindow'); setShowAddUserModal(false); }}
                className="px-4 py-2 text-slate-500 hover:text-white transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => { soundManager.play('save'); addUser(); }}
                className="btn-primary w-full text-white font-bold px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors border border-green-500 border-opacity-30 shadow-glow"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal - خارج الكارد الرئيسي تماماً */}
      {showEditUserModal && editingUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
          onClick={(e) => {
            if (false /* Prevent closing on backdrop click */) {
              soundManager.play('closeWindow');
              setShowEditUserModal(false);
            }
          }}
        >
          <div
            className="glass-card p-6 w-full max-w-md mx-4 "
            style={{
              position: 'relative',
              zIndex: 10000,
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">تعديل المستخدم</h3>
              <button
                onClick={() => { soundManager.play('closeWindow'); setShowEditUserModal(false); }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">الاسم</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">الهاتف</label>
                <input
                  type="tel"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">الدور</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right appearance-none"
                >
                  <option value="cashier">كاشير</option>
                  <option value="manager">مدير متجر</option>
                  <option value="admin">مدير عام</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">كلمة المرور الجديدة (اختياري)</label>
                <input
                  type="password"
                  value={editingUser.newPassword || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                  placeholder="اتركها فارغة للحفاظ على كلمة المرور الحالية"
                />
                {editingUser.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${editingUser.newPassword.length < 6
                            ? 'bg-red-500 w-1/3'
                            : editingUser.newPassword.length < 8
                              ? 'bg-yellow-500 w-2/3'
                              : 'bg-green-500 w-full'
                            }`}
                        ></div>
                      </div>
                      <span className={`text-xs ${editingUser.newPassword.length < 6
                        ? 'text-red-400'
                        : editingUser.newPassword.length < 8
                          ? 'text-yellow-400'
                          : 'text-green-400'
                        }`}>
                        {editingUser.newPassword.length < 6
                          ? 'ضعيفة'
                          : editingUser.newPassword.length < 8
                            ? 'متوسطة'
                            : 'قوية'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { soundManager.play('closeWindow'); setShowEditUserModal(false); }}
                className="px-4 py-2 text-slate-500 hover:text-white transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => { soundManager.play('save'); editUser(); }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors border border-blue-500 border-opacity-30"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
