import { createClient } from '@supabase/supabase-js';
import { publish, EVENTS } from './observerManager';
import { syncManager } from './syncManager';

// Initialize Supabase Client for REALTIME only
// Note: We use Prisma for CRUD (via Electron IPC), but Supabase Client for Realtime subscriptions
const supabaseUrl = 'https://aqiefmheajfllzominuf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxaWVmbWhlYWpmbGx6b21pbnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjQwOTIsImV4cCI6MjA4ODQwMDA5Mn0.jOsJIwaJRqD9b0LlOdbgpH9df0Qs1zbPtNX2fgpzEk0';
export const supabase = createClient(supabaseUrl, supabaseKey);

// Web Browser Polyfill: If we are not running inside Electron (where window.supabaseDB via IPC exists),
// map database operations directly to Supabase JS Client! This enables full online web-app support.
const dbApi = {
    getProducts: async () => {
        const { data } = await supabase.from('Product').select('*');
        if (data) {
            // Update local lookup map
            const products = data.map(p => ({
                id: p.id, name: p.name, category: p.category, price: p.price,
                stock: p.quantity, minStock: p.minQuantity, barcode: p.barcode,
                image: p.image, supplyId: p.supplyId, costPrice: p.costPrice
            }));
            localStorage.setItem('products', JSON.stringify(products));
        }
        return data || [];
    },
    addProduct: async (dataArg) => {
        const payload = { ...dataArg, updatedAt: new Date().toISOString() };
        if (!payload.id) payload.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);

        const allowed = ['name', 'barcode', 'price', 'createdAt', 'updatedAt', 'id', 'category', 'costPrice', 'image', 'minQuantity', 'quantity', 'status', 'supplyId', 'notes'];
        const cleanPayload = {};
        allowed.forEach(key => { if (payload[key] !== undefined) cleanPayload[key] = payload[key]; });

        const { data: res, error } = cleanPayload.id
            ? await supabase.from('Product').upsert(cleanPayload).select().single()
            : await supabase.from('Product').insert(cleanPayload).select().single();
        if (error) throw error; return res;
    },
    updateProduct: async (id, data) => {
        const allowed = ['name', 'barcode', 'price', 'updatedAt', 'category', 'costPrice', 'image', 'minQuantity', 'quantity', 'status', 'supplyId', 'notes'];
        const cleanPayload = { updatedAt: new Date().toISOString() };
        allowed.forEach(key => { if (data[key] !== undefined) cleanPayload[key] = data[key]; });

        const { data: res, error } = await supabase.from('Product').update(cleanPayload).eq('id', id).select().single();
        if (error) throw error; return res;
    },
    deleteProduct: async (id) => { const { error } = await supabase.from('Product').delete().eq('id', id); if (error) throw error; return true; },

    getCategories: async () => { const { data } = await supabase.from('Category').select('*'); return data || []; },
    addCategory: async (dataArg) => {
        const payload = { ...dataArg };
        if (!payload.id) delete payload.id;

        const allowed = ['name', 'id', 'description'];
        const cleanPayload = {};
        if (!payload.id) payload.id = Date.now().toString();
        allowed.forEach(key => { if (payload[key] !== undefined) cleanPayload[key] = payload[key]; });

        const { data: res, error } = cleanPayload.id
            ? await supabase.from('Category').upsert(cleanPayload, { onConflict: 'id' }).select().single()
            : await supabase.from('Category').insert(cleanPayload).select().single();
        if (error) throw error; return res;
    },
    deleteCategory: async (name) => { const { error } = await supabase.from('Category').delete().eq('name', name); if (error) throw error; return true; },

    getCustomers: async () => {
        const { data } = await supabase.from('Customer').select('*');
        if (!data) return [];
        try {
            const localCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
            if (localCustomers.length === 0) return data;

            return data.map(sc => {
                const lc = localCustomers.find(c => String(c.id) === String(sc.id));
                if (lc) {
                    const merged = { ...lc };
                    // Start with local for rich details, then override with Supabase core facts, ONLY if they are not null
                    Object.keys(sc).forEach(key => {
                        if (sc[key] !== null && sc[key] !== '') {
                            merged[key] = sc[key];
                        }
                    });
                    
                    // دمج profileCliches: الاحتفاظ بالقائمة الأطول لضمان عدم فقدان أي أكلشي
                    const localCliches = Array.isArray(lc.profileCliches) ? lc.profileCliches : [];
                    const remoteCliches = Array.isArray(sc.profileCliches) ? sc.profileCliches : [];
                    merged.profileCliches = localCliches.length >= remoteCliches.length ? localCliches : remoteCliches;
                    // Force conversion of core fields to ensure type consistency
                    merged.totalSpent = parseFloat(sc.totalSpent || sc.totalAmount || lc.totalSpent) || 0;
                    merged.orders = parseInt(sc.orders || sc.ordersCount || lc.orders) || 0;
                    
                    return merged;
                }
                return sc;
            });
        } catch (error) {
            console.error('Error merging local customers', error);
            return data;
        }
    },
    addCustomer: async (dataArg) => {
        const payload = { ...dataArg, createdAt: new Date().toISOString() };
        if (!payload.id) payload.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);

        // Allowed schema for Customer (Full Sync Enabled)
        const allowed = [
            'name', 'phone', 'email', 'address', 'id', 'createdAt', 'points',
            'totalPurchases', 'orders', 'lastVisit', 'joinDate', 'status', 'totalSpent',
            'businessActivity', 'usualProduct', 'cliche', 'clicheWidth', 'clicheHeight',
            'colorCount', 'notes', 'profileCliches'
        ];
        const cleanPayload = {};
        allowed.forEach(key => { if (payload[key] !== undefined) cleanPayload[key] = payload[key]; });

        const { data: res, error } = cleanPayload.id
            ? await supabase.from('Customer').upsert(cleanPayload).select().single()
            : await supabase.from('Customer').insert(cleanPayload).select().single();
        if (error) throw error; return res;
    },
    updateCustomer: async (id, data) => {
        const allowed = [
            'name', 'phone', 'email', 'address', 'points', 'totalPurchases', 'orders',
            'lastVisit', 'joinDate', 'status', 'totalSpent',
            'businessActivity', 'usualProduct', 'cliche', 'clicheWidth', 'clicheHeight',
            'colorCount', 'notes', 'profileCliches'
        ];
        const cleanPayload = {};
        allowed.forEach(key => { if (data[key] !== undefined) cleanPayload[key] = data[key]; });

        const { data: res, error } = await supabase.from('Customer').update(cleanPayload).eq('id', id).select().single();
        if (error) throw error;
        publish(EVENTS.CUSTOMERS_CHANGED, { type: 'UPDATE', data: res });
        return res;
    },
    deleteCustomer: async (id) => { const { error } = await supabase.from('Customer').delete().eq('id', id); if (error) throw error; return true; },

    getSales: async () => { const { data } = await supabase.from('Sale').select('*'); return data || []; },
    createSale: async (dataArg) => {
        const payload = { ...dataArg, createdAt: new Date().toISOString() };
        if (!payload.id) payload.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);

        const allowed = ['date', 'id', 'customerId', 'changeAmount', 'createdAt', 'discount', 'items', 'paidAmount', 'paymentMethod', 'shiftId', 'status', 'tax', 'totalAmount', 'profit', 'cashier', 'discountType', 'discountValue', 'subtotal', 'customer', 'total'];
        const cleanPayload = {};
        allowed.forEach(key => { if (payload[key] !== undefined) cleanPayload[key] = payload[key]; });

        const { data: res, error } = cleanPayload.id
            ? await supabase.from('Sale').upsert(cleanPayload).select().single()
            : await supabase.from('Sale').insert(cleanPayload).select().single();
        if (error) throw error; return res;
    },
    deleteSale: async (id) => { const { error } = await supabase.from('Sale').delete().eq('id', id); if (error) throw error; return true; },


    getShifts: async () => { const { data } = await supabase.from('Shift').select('*'); return data || []; },
    startShift: async (dataArg) => {
        const payload = { ...dataArg };
        if (!payload.id) payload.id = Date.now().toString();

        // Allowed schema for Shift
        const allowed = ['startTime', 'endTime', 'status', 'id', 'endBalance', 'startBalance', 'userId', 'sales', 'notes', 'expenses', 'differences'];
        const cleanPayload = {};
        allowed.forEach(key => { if (payload[key] !== undefined) cleanPayload[key] = payload[key]; });

        const { data: res, error } = cleanPayload.id
            ? await supabase.from('Shift').upsert(cleanPayload).select().single()
            : await supabase.from('Shift').insert(cleanPayload).select().single();
        if (error) throw error; return res;
    },
    endShift: async (id, data) => {
        const allowed = ['startTime', 'endTime', 'status', 'endBalance', 'startBalance', 'userId', 'sales', 'notes', 'expenses', 'differences'];
        const cleanPayload = {};
        allowed.forEach(key => { if (data[key] !== undefined) cleanPayload[key] = data[key]; });

        const { data: res, error } = await supabase.from('Shift').update(cleanPayload).eq('id', id).select().single();
        if (error) throw error; return res;
    },

    getExpenses: async () => { const { data } = await supabase.from('Expense').select('*'); return data || []; },
    addExpense: async (dataArg) => {
        const payload = { ...dataArg };
        if (!payload.id) payload.id = String(Date.now());
        
        // Map UI 'type' to DB 'category'
        const category = payload.category || payload.type || 'other';

        // Strict mapping to DB columns to prevent 400 Bad Request (extra fields)
        const cleanPayload = {
            id: payload.id,
            amount: parseFloat(payload.amount) || 0,
            description: payload.description || '',
            date: payload.date || new Date().toISOString(),
            category: category,
            shiftId: payload.shiftId || null
        };

        const { data: res, error } = await supabase.from('Expense')
            .upsert(cleanPayload)
            .select();
            
        if (error) {
            console.error('Supabase AddExpense Error:', error);
            throw error;
        }
        return res && res.length > 0 ? res[0] : null;
    },
    updateExpense: async (id, data) => {
        // Map UI 'type' to DB 'category'
        const category = data.category || data.type;
        
        const cleanPayload = {
            amount: parseFloat(data.amount) || 0,
            description: data.description || '',
            date: data.date || new Date().toISOString(),
            category: category,
            shiftId: data.shiftId || null
        };

        const { data: res, error } = await supabase.from('Expense')
            .update(cleanPayload)
            .eq('id', id)
            .select();
            
        if (error) {
            console.error('Supabase UpdateExpense Error:', error);
            throw error;
        }
        return res && res.length > 0 ? res[0] : null;
    },
    deleteExpense: async (id) => { const { error } = await supabase.from('Expense').delete().eq('id', id); if (error) throw error; return true; },

    getSuppliers: async () => { const { data } = await supabase.from('Supplier').select('*'); return data || []; },
    addSupplier: async (dataArg) => {
        const payload = { ...dataArg, joinDate: new Date().toISOString() };
        if (!payload.id) payload.id = Date.now().toString();

        const allowed = ['name', 'contact', 'id', 'joinDate', 'lastVisit', 'orders', 'totalSpent', 'phone', 'email', 'address'];
        const cleanPayload = {};
        // Map phone to contact if contact is absent
        if (payload.phone && !payload.contact) payload.contact = payload.phone;
        allowed.forEach(key => { if (payload[key] !== undefined) cleanPayload[key] = payload[key]; });

        const { data: res, error } = cleanPayload.id
            ? await supabase.from('Supplier').upsert(cleanPayload).select().single()
            : await supabase.from('Supplier').insert(cleanPayload).select().single();
        if (error) throw error; return res;
    },
    updateSupplier: async (id, data) => {
        const allowed = ['name', 'contact', 'joinDate', 'lastVisit', 'orders', 'totalSpent', 'phone', 'email', 'address'];
        const cleanPayload = {};
        if (data.phone && !data.contact) data.contact = data.phone;
        allowed.forEach(key => { if (data[key] !== undefined) cleanPayload[key] = data[key]; });

        const { data: res, error } = await supabase.from('Supplier').update(cleanPayload).eq('id', id).select().single();
        if (error) throw error; return res;
    },
    deleteSupplier: async (id) => { const { error } = await supabase.from('Supplier').delete().eq('id', id); if (error) throw error; return true; },

    getUsers: async () => { const { data } = await supabase.from('User').select('*'); return data || []; },
    addUser: async (dataArg) => {
        const payload = { ...dataArg };
        if (!payload.id) payload.id = Date.now().toString();

        // Allowed schema for User
        const allowed = ['username', 'password', 'role', 'id', 'name', 'status', 'createdAt', 'lastLogin'];
        const cleanPayload = {};
        // Mapping name to username if needed
        if (payload.name && !payload.username) payload.username = payload.name;

        allowed.forEach(key => { if (payload[key] !== undefined) cleanPayload[key] = payload[key]; });

        const { data: res, error } = cleanPayload.id
            ? await supabase.from('User').upsert(cleanPayload).select().single()
            : await supabase.from('User').insert(cleanPayload).select().single();
        if (error) throw error; return res;
    },
    updateUser: async (id, data) => {
        const allowed = ['username', 'password', 'role', 'name', 'status', 'lastLogin'];
        const cleanPayload = {};
        if (data.name && !data.username) data.username = data.name;
        allowed.forEach(key => { if (data[key] !== undefined) cleanPayload[key] = data[key]; });
        const { data: res, error } = await supabase.from('User').update(cleanPayload).eq('id', id).select().single();
        if (error) throw error; return res;
    },
    deleteUser: async (id) => { const { error } = await supabase.from('User').delete().eq('id', id); if (error) throw error; return true; },

    getSettings: async () => { const { data } = await supabase.from('Setting').select('*'); return data || []; },
    updateSetting: async (key, value) => {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        const { data: existing } = await supabase.from('Setting').select('id').eq('key', key).maybeSingle();
        if (existing) {
            const { data: res, error } = await supabase.from('Setting').update({ value: stringValue }).eq('id', existing.id).select().single();
            if (error) throw error; return res;
        } else {
            const { data: res, error } = await supabase.from('Setting').insert({ key, value: stringValue, id: Date.now().toString() }).select().single();
            if (error) throw error; return res;
        }
    },
    updateProductsCategory: async (oldName, newName) => {
        const { error } = await supabase.from('Product').update({ category: newName }).eq('category', oldName);
        if (error) throw error; return true;
    },
    deleteProductsByCategory: async (categoryName) => {
        const { error } = await supabase.from('Product').delete().eq('category', categoryName);
        if (error) throw error; return true;
    },

    // HELPER: Resolve names from local storage maps
    getCustomerName: (id) => {
        if (!id) return 'نقدي';
        try {
            const customers = JSON.parse(localStorage.getItem('customers') || '[]');
            const customer = customers.find(c => String(c.id) === String(id));
            return customer ? (customer.name || customer.customerName) : 'عميل غير موجود';
        } catch (e) { return 'نقدي'; }
    },
    getSupplierName: (id) => {
        if (!id) return 'مورد غير معروف';
        try {
            const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
            const supplier = suppliers.find(s => String(s.id) === String(id));
            return supplier ? supplier.name : 'مورد غير موجود';
        } catch (e) { return 'مورد غير معروف'; }
    },
    getProductName: (id) => {
        if (!id) return 'منتج غير موجود';
        try {
            const products = JSON.parse(localStorage.getItem('products') || '[]');
            const product = products.find(p => String(p.id) === String(id));
            return product ? product.name : 'منتج غير موجود';
        } catch (e) { return 'منتج غير معروف'; }
    }
};
class SupabaseService {
    constructor() {
        this.subscriptions = new Map();
        this.isRealtimeEnabled = false;
    }

    /**
     * Initialize Realtime subscriptions for all main tables
     */
    initRealtime() {
        if (this.isRealtimeEnabled) return;

        console.log('📡 Initializing Supabase Real-time Sync...');

        const tables = [
            { name: 'Product', event: EVENTS.PRODUCTS_CHANGED, storageKey: 'products' },
            { name: 'Customer', event: EVENTS.CUSTOMERS_CHANGED, storageKey: 'customers' },
            { name: 'Sale', event: EVENTS.INVOICES_CHANGED, storageKey: 'sales' },
            { name: 'Shift', event: EVENTS.SHIFTS_CHANGED, storageKey: 'shifts' },
            { name: 'Category', event: EVENTS.CATEGORIES_CHANGED, storageKey: 'categories' },
            { name: 'Expense', event: EVENTS.EXPENSES_CHANGED, storageKey: 'expenses' },
            { name: 'Supplier', event: EVENTS.SUPPLIERS_CHANGED, storageKey: 'suppliers' },
            { name: 'CustomerOrder', event: EVENTS.CUSTOMER_ORDERS_CHANGED, storageKey: 'customer_orders' },
            { name: 'CustomerPayment', event: EVENTS.CUSTOMER_PAYMENTS_CHANGED, storageKey: 'customer_payments' }
        ];

        tables.forEach(table => {
            const channel = supabase
                .channel(`public:${table.name}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: table.name }, (payload) => {
                    console.log(`🔔 Cloud Change Detected [${table.name}]:`, payload.eventType);

                    // Handle data update locally
                    this.handleRealtimeUpdate(table, payload);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`✅ Subscribed to ${table.name} changes`);
                    }
                });

            this.subscriptions.set(table.name, channel);
        });

        this.isRealtimeEnabled = true;
    }

    async handleRealtimeUpdate(tableInfo, payload) {
        try {
            // Update local storage instantly to ensure offline/online syncing works magically across devices
            const storageKey = tableInfo.storageKey;
            if (storageKey) {
                const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
                let updatedData = [...currentData];

                if (payload.eventType === 'INSERT') {
                    if (!updatedData.find(item => item.id == payload.new.id)) {
                        updatedData.push(payload.new);
                    }
                } else if (payload.eventType === 'UPDATE') {
                    updatedData = updatedData.map(item => {
                        if (item.id == payload.new.id) {
                            // Merge: keep local fields that aren't in Supabase, and prevent cloud nulls from erasing local data
                            const mergedItem = { ...item };
                            Object.keys(payload.new).forEach(k => {
                                if (payload.new[k] !== null && payload.new[k] !== '') {
                                    mergedItem[k] = payload.new[k];
                                }
                            });
                            return mergedItem;
                        }
                        return item;
                    });
                } else if (payload.eventType === 'DELETE') {
                    updatedData = updatedData.filter(item => item.id != payload.old.id);
                }

                localStorage.setItem(storageKey, JSON.stringify(updatedData));
            }

            // Trigger UI update event via observerManager
            publish(tableInfo.event, {
                type: 'remote_sync',
                action: payload.eventType,
                data: payload.new || payload.old
            });

            // Components will fetch fresh data from localStorage because they listen to the publish event
        } catch (error) {
            console.error(`Error handling realtime update for ${tableInfo.name}:`, error);
        }
    }

    stopRealtime() {
        this.subscriptions.forEach(channel => channel.unsubscribe());
        this.subscriptions.clear();
        this.isRealtimeEnabled = false;
    }

    // HELPER: Handle offline check and queuing
    async handleOfflineOperation(method, args, options = {}) {
        const { isSyncing = false, silent = false } = options;

        // If we are currently syncing, just try to execute (don't queue again)
        if (isSyncing) return false; // Let the operation proceed normally during sync

        if (!navigator.onLine) {
            console.log(`📡 Offline: Queuing ${method}...`);
            await syncManager.addToQueue('supabaseService', method, args);
            if (!silent) {
                // Return a mock object or indicate success for local-first UX
                return { id: 'local_' + Date.now(), isOffline: true };
            }
            return true;
        }
        return false;
    }

    // RESOLVERS (FOR REAL-TIME UI)
    getCustomerName(id) { return dbApi.getCustomerName(id); }
    getSupplierName(id) { return dbApi.getSupplierName(id); }
    getProductName(id) { return dbApi.getProductName(id); }

    // PRODUCTS
    async getProducts() {
        try {
            if (dbApi) {
                return await dbApi.getProducts();
            }
            return [];
        } catch (error) {
            console.error('Error fetching products from Supabase:', error);
            return [];
        }
    }

    async addProduct(productData, options = {}) {
        const offlineResult = await this.handleOfflineOperation('addProduct', [productData], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                // Map local data names to Prisma model names if needed
                const data = {
                    id: productData.id ? productData.id.toString() : undefined,
                    name: productData.name,
                    category: productData.category,
                    price: parseFloat(productData.price) || 0,
                    costPrice: parseFloat(productData.costPrice) || 0,
                    quantity: parseFloat(productData.stock) || 0,
                    minQuantity: parseFloat(productData.minStock) || 0,
                    image: productData.image || null,
                    barcode: productData.barcode || null,
                    supplyId: productData.supplyId || null,
                    status: 'active',
                    updatedAt: new Date().toISOString()
                };
                if (!data.id) delete data.id;
                return await dbApi.addProduct(data);
            }
        } catch (error) {
            console.error('Error adding product to Supabase:', error);
            // Fallback: Queue if it was a connection error during online mode
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'addProduct', [productData]);
            throw error;
        }
    }

    async updateProduct(id, productData, options = {}) {
        const offlineResult = await this.handleOfflineOperation('updateProduct', [id, productData], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                const data = {
                    name: productData.name,
                    category: productData.category,
                    price: parseFloat(productData.price) || 0,
                    costPrice: parseFloat(productData.costPrice) || 0,
                    quantity: parseFloat(productData.stock) || 0,
                    minQuantity: parseFloat(productData.minStock) || 0,
                    image: productData.image || null,
                    barcode: productData.barcode || null,
                    supplyId: productData.supplyId || null
                };
                return await dbApi.updateProduct(id, data);
            }
        } catch (error) {
            console.error('Error updating product in Supabase:', error);
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'updateProduct', [id, productData]);
            throw error;
        }
    }

    async deleteProduct(id, options = {}) {
        const offlineResult = await this.handleOfflineOperation('deleteProduct', [id], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.deleteProduct(id);
            }
        } catch (error) {
            console.error('Error deleting product from Supabase:', error);
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'deleteProduct', [id]);
            throw error;
        }
    }

    // CATEGORIES
    async getCategories() {
        try {
            if (dbApi) {
                return await dbApi.getCategories();
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async addCategory(name, description = '', options = {}) {
        const offlineResult = await this.handleOfflineOperation('addCategory', [name, description], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                const payload = {
                    id: name, // We use name as the primary unique fallback locally sometimes
                    name,
                    description
                };
                return await dbApi.addCategory(payload);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'addCategory', [name, description]);
            throw error;
        }
    }

    async deleteCategory(name, options = {}) {
        const offlineResult = await this.handleOfflineOperation('deleteCategory', [name], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.deleteCategory(name);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'deleteCategory', [name]);
            throw error;
        }
    }

    async updateProductsCategory(oldName, newName) {
        try {
            if (dbApi) return await dbApi.updateProductsCategory(oldName, newName);
        } catch (error) { throw error; }
    }

    async deleteProductsByCategory(categoryName) {
        try {
            if (dbApi) return await dbApi.deleteProductsByCategory(categoryName);
        } catch (error) { throw error; }
    }

    // CUSTOMERS
    async getCustomers() {
        try {
            if (dbApi) {
                return await dbApi.getCustomers();
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async addCustomer(customerData, options = {}) {
        const offlineResult = await this.handleOfflineOperation('addCustomer', [customerData], options);
        if (offlineResult) return offlineResult;

        try {
            // Pass all data through — dbApi.addCustomer handles allowed-column filtering
            const data = { ...customerData };
            if (data.id) data.id = data.id.toString();
            // Ensure empty strings become null for optional fields
            if (data.email === '') data.email = null;
            if (data.phone === '') data.phone = null;
            if (data.address === '') data.address = null;
            return await dbApi.addCustomer(data);
        } catch (error) {
            console.error('Supabase addCustomer Error:', error);
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'addCustomer', [customerData]);
            throw error;
        }
    }

    async updateCustomer(id, customerData, options = {}) {
        const offlineResult = await this.handleOfflineOperation('updateCustomer', [id, customerData], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.updateCustomer(id, customerData);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'updateCustomer', [id, customerData]);
            throw error;
        }
    }

    async deleteCustomer(id, options = {}) {
        const offlineResult = await this.handleOfflineOperation('deleteCustomer', [id], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.deleteCustomer(id);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'deleteCustomer', [id]);
            throw error;
        }
    }

    // SALES
    async getSales() {
        try {
            if (dbApi) {
                return await dbApi.getSales();
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async createSale(saleData, options = {}) {
        const offlineResult = await this.handleOfflineOperation('createSale', [saleData], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                // Items mapping
                const items = saleData.items.map(item => ({
                    productId: item.id,
                    quantity: parseInt(item.quantity) || 0,
                    price: parseFloat(item.price) || 0,
                    total: parseFloat(item.total) || 0
                }));

                const data = {
                    id: saleData.id ? saleData.id.toString() : undefined,
                    totalAmount: parseFloat(saleData.total) || 0,
                    paidAmount: parseFloat(saleData.paidAmount || saleData.total) || 0,
                    changeAmount: parseFloat(saleData.changeAmount || 0) || 0,
                    discount: parseFloat(saleData.discount?.amount || 0) || 0,
                    tax: parseFloat(saleData.tax?.amount || 0) || 0,
                    status: 'completed',
                    paymentMethod: saleData.paymentMethod || 'cash',
                    customerId: saleData.customer?.id ? saleData.customer.id.toString() : null,
                    shiftId: saleData.shiftId ? saleData.shiftId.toString() : null,
                    items: items,
                    createdAt: saleData.date ? new Date(saleData.date).toISOString() : new Date().toISOString()
                };
                if (!data.id) delete data.id;
                return await dbApi.createSale(data);
            }
        } catch (error) {
            console.error('Error creating sale in Supabase:', error);
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'createSale', [saleData]);
            throw error;
        }
    }

    async deleteSale(id, options = {}) {
        const offlineResult = await this.handleOfflineOperation('deleteSale', [id], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.deleteSale(id);
            }
        } catch (error) {
            console.error('Error deleting sale from Supabase:', error);
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'deleteSale', [id]);
            throw error;
        }
    }


    // SHIFTS
    async getShifts() {
        try {
            if (dbApi) {
                return await dbApi.getShifts();
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async startShift(data, options = {}) {
        const offlineResult = await this.handleOfflineOperation('startShift', [data], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.startShift(data);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'startShift', [data]);
            throw error;
        }
    }

    async endShift(id, data, options = {}) {
        const offlineResult = await this.handleOfflineOperation('endShift', [id, data], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.endShift(id, data);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'endShift', [id, data]);
            throw error;
        }
    }

    // USERS
    async getUsers() {
        try {
            if (dbApi) {
                return await dbApi.getUsers();
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async addUser(userData, options = {}) {
        const offlineResult = await this.handleOfflineOperation('addUser', [userData], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.addUser(userData);
            }
        } catch (error) {
            // 409 = conflict (user already exists) - skip silently
            if (error?.code === '23505' || error?.status === 409) {
                console.warn('User already exists, skipping:', userData.username || userData.name);
                return null;
            }
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'addUser', [userData]);
            throw error;
        }
    }

    async updateUser(id, userData, options = {}) {
        const offlineResult = await this.handleOfflineOperation('updateUser', [id, userData], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.updateUser(id, userData);
            }
        } catch (error) {
            console.error('Error updating user in Supabase:', error);
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'updateUser', [id, userData]);
            throw error;
        }
    }

    async deleteUser(id, options = {}) {
        const offlineResult = await this.handleOfflineOperation('deleteUser', [id], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.deleteUser(id);
            }
        } catch (error) {
            console.error('Error deleting user from Supabase:', error);
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'deleteUser', [id]);
            throw error;
        }
    }

    // SETTINGS
    async getSettings() {
        try {
            if (dbApi) {
                return await dbApi.getSettings();
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async updateSetting(key, value, options = {}) {
        const offlineResult = await this.handleOfflineOperation('updateSetting', [key, value], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.updateSetting(key, value);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'updateSetting', [key, value]);
            throw error;
        }
    }

    // EXPENSES
    async getExpenses() {
        try {
            if (dbApi) {
                return await dbApi.getExpenses();
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async addExpense(data, options = {}) {
        const offlineResult = await this.handleOfflineOperation('addExpense', [data], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                // Pass all data through — dbApi handles allowed-column filtering
                return await dbApi.addExpense(data);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'addExpense', [data]);
            throw error;
        }
    }

    async updateExpense(id, data, options = {}) {
        const offlineResult = await this.handleOfflineOperation('updateExpense', [id, data], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.updateExpense(id, {
                    ...data,
                    amount: parseFloat(data.amount) || 0,
                    date: data.date ? new Date(data.date) : new Date()
                });
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'updateExpense', [id, data]);
            throw error;
        }
    }

    async deleteExpense(id, options = {}) {
        const offlineResult = await this.handleOfflineOperation('deleteExpense', [id], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.deleteExpense(id);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'deleteExpense', [id]);
            throw error;
        }
    }

    // SUPPLIERS
    async getSuppliers() {
        try {
            if (dbApi) {
                return await dbApi.getSuppliers();
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async addSupplier(data, options = {}) {
        const offlineResult = await this.handleOfflineOperation('addSupplier', [data], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                // Pass all data through — dbApi handles allowed-column filtering
                return await dbApi.addSupplier(data);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'addSupplier', [data]);
            throw error;
        }
    }

    async updateSupplier(id, data, options = {}) {
        const offlineResult = await this.handleOfflineOperation('updateSupplier', [id, data], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.updateSupplier(id, {
                    name: data.name,
                    contact: data.contact || null,
                    totalSpent: parseFloat(data.totalSpent) || 0,
                    orders: parseInt(data.orders) || 0,
                    lastVisit: data.lastVisit ? new Date(data.lastVisit).toISOString() : null,
                    joinDate: data.joinDate ? new Date(data.joinDate).toISOString() : new Date().toISOString()
                });
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'updateSupplier', [id, data]);
            throw error;
        }
    }

    async deleteSupplier(id, options = {}) {
        const offlineResult = await this.handleOfflineOperation('deleteSupplier', [id], options);
        if (offlineResult) return offlineResult;

        try {
            if (dbApi) {
                return await dbApi.deleteSupplier(id);
            }
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'deleteSupplier', [id]);
            throw error;
        }
    }

    // ─── CUSTOMER ORDERS ──────────────────────────────────────────────────────
    async getCustomerOrders(customerId) {
        try {
            const { data } = await supabase.from('CustomerOrder').select('*').eq('customerId', customerId);
            return data || [];
        } catch (error) {
            console.error('Error fetching customer orders:', error);
            return [];
        }
    }

    async getAllCustomerOrders() {
        try {
            const { data } = await supabase.from('CustomerOrder').select('*');
            return data || [];
        } catch (error) {
            return [];
        }
    }

    async addCustomerOrder(orderData, options = {}) {
        const offlineResult = await this.handleOfflineOperation('addCustomerOrder', [orderData], options);
        if (offlineResult) return offlineResult;
        try {
            const payload = {
                id: orderData.id?.toString() || Date.now().toString(),
                customerId: orderData.customerId?.toString(),
                customerName: orderData.customerName || '',
                orderNumber: orderData.orderNumber || '',
                date: orderData.date || '',
                productType: orderData.productType || '',
                quantity: parseFloat(orderData.quantity) || 0,
                pricePerKg: parseFloat(orderData.pricePerKg) || 0,
                colorCount: parseFloat(orderData.colorCount) || 0,
                clicheWidth: parseFloat(orderData.clicheWidth) || 0,
                clicheHeight: parseFloat(orderData.clicheHeight) || 0,
                printingCostPerKg: parseFloat(orderData.printingCostPerKg) || 0,
                cuttingCostPerKg: parseFloat(orderData.cuttingCostPerKg) || 0,
                notes: orderData.notes || '',
                clicheEnabled: !!orderData.clicheEnabled,
                clicheCost: parseFloat(orderData.clicheCost) || 0,
                color: orderData.color || '',
                size: orderData.size || '',
                deliveryDate: orderData.deliveryDate || '',
                reminderDate: orderData.reminderDate || '',
                profitMargin: parseFloat(orderData.profitMargin) || 0,
                status: orderData.status || 'OPEN',
                createdAt: new Date().toISOString()
            };
            const { data: res, error } = await supabase.from('CustomerOrder').upsert(payload).select().single();
            if (error) throw error;
            return res;
        } catch (error) {
            console.error('Error adding customer order:', error);
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'addCustomerOrder', [orderData]);
            throw error;
        }
    }

    async updateCustomerOrder(id, orderData, options = {}) {
        const offlineResult = await this.handleOfflineOperation('updateCustomerOrder', [id, orderData], options);
        if (offlineResult) return offlineResult;
        try {
            const { data: res, error } = await supabase.from('CustomerOrder').update({
                productType: orderData.productType,
                quantity: parseFloat(orderData.quantity) || 0,
                pricePerKg: parseFloat(orderData.pricePerKg) || 0,
                colorCount: parseFloat(orderData.colorCount) || 0,
                clicheWidth: parseFloat(orderData.clicheWidth) || 0,
                clicheHeight: parseFloat(orderData.clicheHeight) || 0,
                printingCostPerKg: parseFloat(orderData.printingCostPerKg) || 0,
                cuttingCostPerKg: parseFloat(orderData.cuttingCostPerKg) || 0,
                notes: orderData.notes || '',
                clicheEnabled: !!orderData.clicheEnabled,
                clicheCost: parseFloat(orderData.clicheCost) || 0,
                color: orderData.color || '',
                size: orderData.size || '',
                deliveryDate: orderData.deliveryDate || '',
                reminderDate: orderData.reminderDate || '',
                profitMargin: parseFloat(orderData.profitMargin) || 0,
                status: orderData.status
            }).eq('id', id.toString()).select().single();
            if (error) throw error;
            return res;
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'updateCustomerOrder', [id, orderData]);
            throw error;
        }
    }

    async deleteCustomerOrder(id, options = {}) {
        const offlineResult = await this.handleOfflineOperation('deleteCustomerOrder', [id], options);
        if (offlineResult) return offlineResult;
        try {
            const { error } = await supabase.from('CustomerOrder').delete().eq('id', id.toString());
            if (error) throw error;
            return true;
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'deleteCustomerOrder', [id]);
            throw error;
        }
    }

    // ─── CUSTOMER PAYMENTS ────────────────────────────────────────────────────
    async getCustomerPayments(customerId) {
        try {
            const { data } = await supabase.from('CustomerPayment').select('*').eq('customerId', customerId);
            return data || [];
        } catch (error) {
            console.error('Error fetching customer payments:', error);
            return [];
        }
    }

    async addCustomerPayment(paymentData, options = {}) {
        const offlineResult = await this.handleOfflineOperation('addCustomerPayment', [paymentData], options);
        if (offlineResult) return offlineResult;
        try {
            const payload = {
                id: paymentData.id?.toString() || Date.now().toString(),
                customerId: paymentData.customerId?.toString(),
                amount: parseFloat(paymentData.amount) || 0,
                date: paymentData.date || new Date().toISOString().split('T')[0],
                note: paymentData.note || '',
                createdAt: new Date().toISOString()
            };
            const { data: res, error } = await supabase.from('CustomerPayment').upsert(payload).select().single();
            if (error) throw error;
            return res;
        } catch (error) {
            console.error('Error adding customer payment:', error);
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'addCustomerPayment', [paymentData]);
            throw error;
        }
    }

    async deleteCustomerPayment(id, options = {}) {
        const offlineResult = await this.handleOfflineOperation('deleteCustomerPayment', [id], options);
        if (offlineResult) return offlineResult;
        try {
            const { error } = await supabase.from('CustomerPayment').delete().eq('id', id.toString());
            if (error) throw error;
            return true;
        } catch (error) {
            if (!options.isSyncing) await syncManager.addToQueue('supabaseService', 'deleteCustomerPayment', [id]);
            throw error;
        }
    }
}


export const supabaseService = new SupabaseService();
export default supabaseService;
