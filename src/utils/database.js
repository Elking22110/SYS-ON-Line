// نظام قاعدة البيانات المحلية باستخدام IndexedDB
import { getCurrentDate } from './dateUtils.js';
import encryptionManager from './encryption.js';


class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbName = 'POS_Database';
    this.version = 1;
  }

  // تهيئة قاعدة البيانات
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('خطأ في فتح قاعدة البيانات:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('تم فتح قاعدة البيانات بنجاح');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // إنشاء جداول البيانات
        this.createStores(db);
      };
    });
  }

  // إنشاء جداول البيانات
  createStores(db) {
    console.log('إنشاء جداول قاعدة البيانات...');
    // جدول المنتجات
    if (!db.objectStoreNames.contains('products')) {
      const productsStore = db.createObjectStore('products', { keyPath: 'id' });
      productsStore.createIndex('name', 'name', { unique: false });
      productsStore.createIndex('category', 'category', { unique: false });
      productsStore.createIndex('barcode', 'barcode', { unique: true });
    }

    // جدول التصنيفات
    if (!db.objectStoreNames.contains('categories')) {
      const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
      categoriesStore.createIndex('name', 'name', { unique: true });
    }

    // جدول العملاء
    if (!db.objectStoreNames.contains('customers')) {
      const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
      customersStore.createIndex('name', 'name', { unique: false });
      customersStore.createIndex('phone', 'phone', { unique: true });
      customersStore.createIndex('email', 'email', { unique: true });
    }

    // جدول المبيعات
    if (!db.objectStoreNames.contains('sales')) {
      const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
      salesStore.createIndex('date', 'date', { unique: false });
      salesStore.createIndex('customerId', 'customerId', { unique: false });
      salesStore.createIndex('shiftId', 'shiftId', { unique: false });
    }

    // جدول الورديات
    if (!db.objectStoreNames.contains('shifts')) {
      const shiftsStore = db.createObjectStore('shifts', { keyPath: 'id' });
      shiftsStore.createIndex('startTime', 'startTime', { unique: false });
      shiftsStore.createIndex('status', 'status', { unique: false });
    }

    // جدول المرتجعات
    if (!db.objectStoreNames.contains('returns')) {
      const returnsStore = db.createObjectStore('returns', { keyPath: 'id' });
      returnsStore.createIndex('saleId', 'saleId', { unique: false });
      returnsStore.createIndex('date', 'date', { unique: false });
    }

    // جدول المستخدمين
    if (!db.objectStoreNames.contains('users')) {
      const usersStore = db.createObjectStore('users', { keyPath: 'id' });
      usersStore.createIndex('username', 'username', { unique: true });
      usersStore.createIndex('email', 'email', { unique: true });
    }

    // جدول الإعدادات
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' });
    }

    // جدول النسخ الاحتياطية
    if (!db.objectStoreNames.contains('backups')) {
      const backupsStore = db.createObjectStore('backups', { keyPath: 'id' });
      backupsStore.createIndex('date', 'date', { unique: false });
      backupsStore.createIndex('type', 'type', { unique: false });
    }
    console.log('تم إنشاء جميع جداول قاعدة البيانات بنجاح');
  }

  // إنشاء الجداول المفقودة
  async ensureStoresExist() {
    if (!this.db) {
      await this.init();
    }

    const requiredStores = ['products', 'categories', 'customers', 'sales', 'shifts', 'returns', 'users', 'settings', 'backups'];
    const missingStores = requiredStores.filter(storeName => !this.db.objectStoreNames.contains(storeName));

    if (missingStores.length > 0) {
      console.log('جداول مفقودة:', missingStores);
      // إعادة تهيئة قاعدة البيانات لإنشاء الجداول المفقودة
      await this.init();
    }
  }

  // إضافة بيانات
  async add(storeName, data) {
    // التأكد من تهيئة قاعدة البيانات
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('قاعدة البيانات غير مهيأة'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // تحديث بيانات
  async update(storeName, data) {
    // التأكد من تهيئة قاعدة البيانات
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('قاعدة البيانات غير مهيأة'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // حذف بيانات
  async delete(storeName, id) {
    // التأكد من تهيئة قاعدة البيانات
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('قاعدة البيانات غير مهيأة'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // الحصول على بيانات
  async get(storeName, id) {
    // التأكد من تهيئة قاعدة البيانات
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('قاعدة البيانات غير مهيأة'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // الحصول على جميع البيانات
  async getAll(storeName) {
    // التأكد من تهيئة قاعدة البيانات
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('قاعدة البيانات غير مهيأة'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // البحث في البيانات
  async search(storeName, indexName, value) {
    // التأكد من تهيئة قاعدة البيانات
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('قاعدة البيانات غير مهيأة'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // الحصول على البيانات بفلترة
  async getByRange(storeName, indexName, range) {
    // التأكد من تهيئة قاعدة البيانات
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('قاعدة البيانات غير مهيأة'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // إنشاء نسخة احتياطية
  async createBackup(type = 'full') {
    try {
      const backupData = {
        id: `backup_${Date.now()}`,
        type,
        date: getCurrentDate(),
        data: {}
      };

      // نسخ جميع الجداول من IndexedDB
      const stores = ['products', 'categories', 'customers', 'sales', 'shifts', 'returns', 'users', 'settings'];

      for (const store of stores) {
        try {
          backupData.data[store] = await this.getAll(store);
        } catch (error) {
          console.warn(`خطأ في نسخ جدول ${store}:`, error);
          backupData.data[store] = [];
        }
      }

      // دالة مساعدة لجلب القيمة وفك تشفيرها بأمان من localStorage كـ JSON أو الاحتفاظ بها كنص
      const getLocalStorageItem = (key, defaultValue = '{}') => {
        const item = localStorage.getItem(key);
        if (item === null) {
          try {
            return JSON.parse(defaultValue);
          } catch {
            return defaultValue;
          }
        }
        try {
          return JSON.parse(item);
        } catch {
          return item; // الاحتفاظ بها كنص خام إذا لم تكن بصيغة JSON
        }
      };

      // نسخ بيانات localStorage بالكامل مع الحفاظ على التسمية الأصلية الدقيقة
      backupData.data.localStorage = {
        'storeInfo': getLocalStorageItem('storeInfo', '{}'),
        'pos-settings': getLocalStorageItem('pos-settings', '{}'),
        'productCategories': getLocalStorageItem('productCategories', '[]'),
        'products': getLocalStorageItem('products', '[]'),
        'sales': getLocalStorageItem('sales', '[]'),
        'customers': getLocalStorageItem('customers', '[]'),
        'customer_orders': getLocalStorageItem('customer_orders', '[]'),
        'customer_payments': getLocalStorageItem('customer_payments', '[]'),
        'suppliers': getLocalStorageItem('suppliers', '[]'),
        'supplier_supplies': getLocalStorageItem('supplier_supplies', '[]'),
        'supplier_payments': getLocalStorageItem('supplier_payments', '[]'),
        'ink_suppliers': getLocalStorageItem('ink_suppliers', '[]'),
        'ink_supplies': getLocalStorageItem('ink_supplies', '[]'),
        'ink_payments': getLocalStorageItem('ink_payments', '[]'),
        'cliche_suppliers': getLocalStorageItem('cliche_suppliers', '[]'),
        'cliche_supplies': getLocalStorageItem('cliche_supplies', '[]'),
        'cliche_payments': getLocalStorageItem('cliche_payments', '[]'),
        'expenses': getLocalStorageItem('expenses', '[]'),
        'shifts': getLocalStorageItem('shifts', '[]'),
        'activeShift': getLocalStorageItem('activeShift', 'null'),
        'users': getLocalStorageItem('users', '[]'),
        'notifications': getLocalStorageItem('notifications', '[]'),
        'system-settings': getLocalStorageItem('system-settings', '{}'),
        'elking_license': localStorage.getItem('elking_license') || '',
        'design_theme': localStorage.getItem('design_theme') || 'dark',
        'productImages': getLocalStorageItem('productImages', '{}'),
        'security_logs': getLocalStorageItem('security_logs', '[]'),
        'activity_logs': getLocalStorageItem('activity_logs', '[]'),
        'encryption_key': localStorage.getItem('encryption_key') || '',
        'soundEnabled': localStorage.getItem('soundEnabled') || 'true',
        'soundVolume': localStorage.getItem('soundVolume') || '1',
        'app_muted': localStorage.getItem('app_muted') || 'false',
        'app_volume': localStorage.getItem('app_volume') || '0.5'
      };

      // حفظ النسخة الاحتياطية
      await this.add('backups', backupData);

      console.log('تم إنشاء نسخة احتياطية شاملة:', backupData.id);
      return backupData;
    } catch (error) {
      console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
      throw error;
    }
  }

  // استعادة نسخة احتياطية
  async restoreBackup(backupId) {
    try {
      const backup = await this.get('backups', backupId);
      if (!backup) {
        throw new Error('النسخة الاحتياطية غير موجودة');
      }

      let backupData = backup.data;

      // فك تشفير النسخة الاحتياطية إذا كانت مشفرة
      if (backup.encrypted && backup.encryptedData) {
        try {
          backupData = encryptionManager.decryptObject(backup.encryptedData);
        } catch (decryptError) {
          console.error('خطأ في فك تشفير النسخة الاحتياطية:', decryptError);
          throw new Error('فشل في فك تشفير النسخة الاحتياطية');
        }
      }

      // استخراج البيانات الفعلية في حال كانت مغلفة بداخل كائن النسخة بالكامل
      if (backupData && backupData.data && typeof backupData.data === 'object' && !backupData.products && !backupData.sales) {
        backupData = backupData.data;
      }

      // التحقق من صحة بيانات النسخة الاحتياطية
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('بيانات النسخة الاحتياطية غير صحيحة');
      }

      // استدعاء importData لاستعادة البيانات بالكامل ومنع تكرار الكود
      await this.importData(backupData);

      console.log('تم استعادة النسخة الاحتياطية بنجاح:', backupId);
      return true;
    } catch (error) {
      console.error('خطأ في استعادة النسخة الاحتياطية:', error);
      throw error;
    }
  }

  // الحصول على قائمة النسخ الاحتياطية
  async getBackups() {
    return await this.getAll('backups');
  }

  // حذف نسخة احتياطية
  async deleteBackup(backupId) {
    return await this.delete('backups', backupId);
  }

  // تصدير البيانات بالكامل
  async exportData() {
    const exportData = {
      metadata: {
        exportDate: getCurrentDate(),
        version: '1.0',
        system: 'POS System'
      }
    };

    // تصدير بيانات IndexedDB
    const stores = ['products', 'categories', 'customers', 'sales', 'shifts', 'returns', 'users', 'settings'];

    for (const store of stores) {
      try {
        exportData[store] = await this.getAll(store);
      } catch (error) {
        console.warn(`خطأ في تصدير جدول ${store}:`, error);
        exportData[store] = [];
      }
    }

    // دالة مساعدة لجلب القيمة وفك تشفيرها بأمان من localStorage كـ JSON أو الاحتفاظ بها كنص
    const getLocalStorageItem = (key, defaultValue = '{}') => {
      const item = localStorage.getItem(key);
      if (item === null) {
        try {
          return JSON.parse(defaultValue);
        } catch {
          return defaultValue;
        }
      }
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    };

    // تصدير بيانات localStorage بالكامل مع الحفاظ على التسمية الدقيقة
    exportData.localStorage = {
      'storeInfo': getLocalStorageItem('storeInfo', '{}'),
      'pos-settings': getLocalStorageItem('pos-settings', '{}'),
      'productCategories': getLocalStorageItem('productCategories', '[]'),
      'products': getLocalStorageItem('products', '[]'),
      'sales': getLocalStorageItem('sales', '[]'),
      'customers': getLocalStorageItem('customers', '[]'),
      'customer_orders': getLocalStorageItem('customer_orders', '[]'),
      'customer_payments': getLocalStorageItem('customer_payments', '[]'),
      'suppliers': getLocalStorageItem('suppliers', '[]'),
      'supplier_supplies': getLocalStorageItem('supplier_supplies', '[]'),
      'supplier_payments': getLocalStorageItem('supplier_payments', '[]'),
      'ink_suppliers': getLocalStorageItem('ink_suppliers', '[]'),
      'ink_supplies': getLocalStorageItem('ink_supplies', '[]'),
      'ink_payments': getLocalStorageItem('ink_payments', '[]'),
      'cliche_suppliers': getLocalStorageItem('cliche_suppliers', '[]'),
      'cliche_supplies': getLocalStorageItem('cliche_supplies', '[]'),
      'cliche_payments': getLocalStorageItem('cliche_payments', '[]'),
      'expenses': getLocalStorageItem('expenses', '[]'),
      'shifts': getLocalStorageItem('shifts', '[]'),
      'activeShift': getLocalStorageItem('activeShift', 'null'),
      'users': getLocalStorageItem('users', '[]'),
      'notifications': getLocalStorageItem('notifications', '[]'),
      'system-settings': getLocalStorageItem('system-settings', '{}'),
      'elking_license': localStorage.getItem('elking_license') || '',
      'design_theme': localStorage.getItem('design_theme') || 'dark',
      'productImages': getLocalStorageItem('productImages', '{}'),
      'security_logs': getLocalStorageItem('security_logs', '[]'),
      'activity_logs': getLocalStorageItem('activity_logs', '[]'),
      'encryption_key': localStorage.getItem('encryption_key') || '',
      'soundEnabled': localStorage.getItem('soundEnabled') || 'true',
      'soundVolume': localStorage.getItem('soundVolume') || '1',
      'app_muted': localStorage.getItem('app_muted') || 'false',
      'app_volume': localStorage.getItem('app_volume') || '0.5'
    };

    return exportData;
  }

  // تصدير الإعدادات فقط
  async exportSettings() {
    const settingsData = {
      metadata: {
        exportDate: getCurrentDate(),
        version: '1.0',
        system: 'POS System',
        type: 'settings_only'
      },
      settings: await this.getAll('settings'),
      localStorage: {
        'storeInfo': JSON.parse(localStorage.getItem('storeInfo') || '{}'),
        'pos-settings': JSON.parse(localStorage.getItem('pos-settings') || '{}'),
        'system-settings': JSON.parse(localStorage.getItem('system-settings') || '{}'),
        'design_theme': localStorage.getItem('design_theme') || 'dark',
        'elking_license': localStorage.getItem('elking_license') || ''
      }
    };

    return settingsData;
  }

  // استيراد الإعدادات فقط
  async importSettings(data) {
    try {
      // التأكد من تهيئة قاعدة البيانات
      if (!this.db) {
        await this.init();
      }

      // استيراد إعدادات IndexedDB
      if (data.settings && data.settings.length > 0) {
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');

        // مسح الإعدادات الموجودة
        await new Promise((resolve, reject) => {
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => resolve();
          clearRequest.onerror = () => reject(clearRequest.error);
        });

        // إضافة الإعدادات الجديدة
        for (const setting of data.settings) {
          await new Promise((resolve, reject) => {
            const request = store.put(setting);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      }

      // استيراد إعدادات localStorage
      if (data.localStorage) {
        for (let [key, value] of Object.entries(data.localStorage)) {
          // تصحيح التسميات القديمة لضمان التوافقية
          if (key === 'posSettings') key = 'pos-settings';
          if (key === 'systemSettings') key = 'system-settings';

          try {
            if (value === null || value === undefined) {
              localStorage.removeItem(key);
            } else if (typeof value === 'string') {
              localStorage.setItem(key, value);
            } else {
              localStorage.setItem(key, JSON.stringify(value));
            }
            console.log(`تم استيراد إعداد ${key} إلى localStorage`);
          } catch (error) {
            console.warn(`خطأ في استيراد إعداد ${key}:`, error);
          }
        }
      }

      // تنبيه صفحات النظام لتحديث واجهاتها فوراً
      window.dispatchEvent(new Event('dataUpdated'));

      console.log('تم استيراد الإعدادات بنجاح');
      return true;
    } catch (error) {
      console.error('خطأ في استيراد الإعدادات:', error);
      throw error;
    }
  }

  // استيراد البيانات
  async importData(data) {
    try {
      // التأكد من تهيئة قاعدة البيانات
      if (!this.db) {
        await this.init();
      }

      // التأكد من وجود جميع الجداول المطلوبة
      await this.ensureStoresExist();

      // فك تغليف البيانات في حال كانت مغلفة بداخل كائن النسخة بالكامل
      let actualData = data;
      if (data && data.data && typeof data.data === 'object' && !data.products && !data.sales) {
        actualData = data.data;
      }

      // استيراد بيانات IndexedDB
      for (const [storeName, items] of Object.entries(actualData)) {
        // تخطي metadata و localStorage
        if (storeName === 'metadata' || storeName === 'localStorage') {
          continue;
        }

        // التحقق من وجود الجدول قبل محاولة الوصول إليه
        if (!this.db.objectStoreNames.contains(storeName)) {
          console.warn(`الجدول ${storeName} غير موجود، سيتم تخطيه`);
          continue;
        }

        if (items && items.length > 0) {
          const transaction = this.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);

          // مسح البيانات الموجودة أولاً
          await new Promise((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
          });

          for (const item of items) {
            await new Promise((resolve, reject) => {
              const request = store.put(item);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        }
      }

      // استيراد بيانات localStorage
      if (actualData.localStorage) {
        console.log('استيراد بيانات localStorage...');
        for (let [key, value] of Object.entries(actualData.localStorage)) {
          // تصحيح التسميات القديمة لضمان التوافقية
          if (key === 'posSettings') key = 'pos-settings';
          if (key === 'systemSettings') key = 'system-settings';

          try {
            if (value === null || value === undefined) {
              localStorage.removeItem(key);
            } else if (typeof value === 'string') {
              localStorage.setItem(key, value);
            } else {
              localStorage.setItem(key, JSON.stringify(value));
            }
            console.log(`تم استيراد ${key} إلى localStorage`);
          } catch (error) {
            console.warn(`خطأ في استيراد ${key} إلى localStorage:`, error);
          }
        }
      }

      // تنبيه صفحات النظام لتحديث واجهاتها فوراً
      window.dispatchEvent(new Event('dataUpdated'));

      console.log('تم استيراد جميع البيانات بنجاح');
      return true;
    } catch (error) {
      console.error('خطأ في استيراد البيانات:', error);
      throw error;
    }
  }

  // إحصائيات قاعدة البيانات
  async getStats() {
    const stats = {};
    const stores = ['products', 'categories', 'customers', 'sales', 'shifts', 'returns', 'users'];

    for (const store of stores) {
      try {
        const data = await this.getAll(store);
        stats[store] = data.length;
      } catch (error) {
        stats[store] = 0;
      }
    }

    return stats;
  }

  // تنظيف قاعدة البيانات - معطل لحماية البيانات
  async cleanup() {
    try {
      // تم تعطيل هذه الوظيفة لحماية البيانات من الحذف التلقائي
      console.log('⚠️ تم تعطيل تنظيف قاعدة البيانات لحماية البيانات');
      throw new Error('تم تعطيل تنظيف قاعدة البيانات لحماية البيانات');
    } catch (error) {
      console.error('خطأ في تنظيف قاعدة البيانات:', error);
      throw error;
    }
  }
}

// إنشاء مثيل واحد من مدير قاعدة البيانات
const databaseManager = new DatabaseManager();

export default databaseManager;