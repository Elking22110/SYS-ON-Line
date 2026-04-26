import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShoppingCart,
  Star,
  Filter,
  Download,
  Upload,
  FileText,
  Briefcase,
  Tag,
  Palette,
  Layers,
  Hash,
  Users,
  X
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';
import { formatDate, formatTimeOnly, getCurrentDate } from '../utils/dateUtils.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import safeMath from '../utils/safeMath.js';
import supabaseService from '../utils/supabaseService';
import toast from 'react-hot-toast';

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const statuses = ['الكل', 'نشط', 'VIP', 'جديد', 'غير نشط'];

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const supabaseCustomers = await supabaseService.getCustomers();
      const localCustomers = JSON.parse(localStorage.getItem('customers') || '[]');

      let mergedCustomers = (supabaseCustomers && supabaseCustomers.length > 0)
        ? supabaseCustomers.map(sc => {
          const localItem = localCustomers.find(lc => lc.id?.toString() === sc.id?.toString());
          return {
            ...localItem,
            ...sc,
            businessActivity: sc.businessActivity || localItem?.businessActivity || '',
            usualProduct: sc.usualProduct || localItem?.usualProduct || '',
            cliche: sc.cliche || localItem?.cliche || '',
            clicheWidth: sc.clicheWidth || localItem?.clicheWidth || '',
            clicheHeight: sc.clicheHeight || localItem?.clicheHeight || '',
            colorCount: sc.colorCount || localItem?.colorCount || '',
            notes: sc.notes || localItem?.notes || '',
            sizeWidth: sc.sizeWidth || localItem?.sizeWidth || '',
            sizeHeight: sc.sizeHeight || localItem?.sizeHeight || '',
            profileSizes: (() => {
              const localSizes = Array.isArray(localItem?.profileSizes) ? localItem.profileSizes : [];
              const supabaseSizes = Array.isArray(sc.profileSizes) ? sc.profileSizes : [];
              return supabaseSizes.length >= localSizes.length ? supabaseSizes : localSizes;
            })(),
            profileCliches: (() => {
              const localCliches = Array.isArray(localItem?.profileCliches) ? localItem.profileCliches : [];
              const supabaseCliches = Array.isArray(sc.profileCliches) ? sc.profileCliches : [];
              return supabaseCliches.length >= localCliches.length ? supabaseCliches : localCliches;
            })()
          };
        })
        : localCustomers;

      const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
      const allPayments = JSON.parse(localStorage.getItem('customer_payments') || '[]');

      const updatedCustomers = mergedCustomers.map(customer => {
        const customerIdStr = customer.id?.toString();

        // Calculate dynamic stats from orders
        const customerOrders = allOrders.filter(o => o.customerId?.toString() === customerIdStr);
        const closedOrders = customerOrders.filter(o => o.status === 'CLOSED');
        const ordersCount = customerOrders.length; // Keep total order count for activity reference

        const totalSpentAmount = closedOrders.reduce((sum, o) => {
          if (o.totalPrice !== undefined && o.totalPrice !== null) {
              return safeMath.add(sum, parseFloat(o.totalPrice));
          }

          const q = parseFloat(o.quantity) || 0;
          const pricePerKg = parseFloat(o.pricePerKg) || 0;
          const printingCostPerKg = parseFloat(o.printingCostPerKg) || 0;
          const cuttingCostPerKg = parseFloat(o.cuttingCostPerKg) || 0;
          const profitMargin = parseFloat(o.profitMargin) || 0;
          const clicheCost = o.clicheEnabled ? (parseFloat(o.clicheCost) || 0) : 0;

          const totalPricePerKg = safeMath.add(
              safeMath.add(pricePerKg, printingCostPerKg),
              safeMath.add(cuttingCostPerKg, profitMargin)
          );

          const subtotal = safeMath.multiply(totalPricePerKg, q);
          const orderTotal = safeMath.add(subtotal, clicheCost);

          return safeMath.add(sum, orderTotal);
        }, 0);

        const lastOrder = [...customerOrders].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];
        const lastVisitDate = lastOrder ? lastOrder.date : (customer.lastVisit || null);

        const totalQuantity = closedOrders.reduce((sum, o) => safeMath.add(sum, parseFloat(o.quantity) || 0), 0);
        const totalWaste = closedOrders.reduce((sum, o) => safeMath.add(sum, parseFloat(o.wasteQuantity) || 0), 0);

        let status = customer.status || 'جديد';
        if (totalQuantity >= 5000) status = 'VIP'; // الوصول لـ 5 طن
        else if (totalSpentAmount >= 2000) status = 'نشط';
        else if (ordersCount > 0) status = 'نشط';
        else status = 'جديد';
        return {
          ...customer,
          status,
          totalSpent: totalSpentAmount,
          orders: ordersCount,
          totalQuantity,
          totalWaste,
          lastVisit: lastVisitDate,
          joinDate: customer.createdAt ? customer.createdAt.split('T')[0] : (customer.joinDate || getCurrentDate().split('T')[0])
        };
      });

      setCustomers(updatedCustomers);
      localStorage.setItem('customers', JSON.stringify(updatedCustomers));
    } catch (error) {
      console.error('خطأ في تحميل العملاء:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();

    const handleStorageChange = (e) => {
      if (e.key === 'customers') loadCustomers();
    };

    window.addEventListener('storage', handleStorageChange);
    const unsubCustomers = typeof subscribe === 'function' ? subscribe(EVENTS.CUSTOMERS_CHANGED, loadCustomers) : null;

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (typeof unsubCustomers === 'function') unsubCustomers();
    };
  }, []);

  const handleAddCustomer = async (formData) => {
    if (formData.name && formData.phone) {
      try {
        const saved = await toast.promise(
          supabaseService.addCustomer({
            ...formData,
            status: 'جديد'
          }),
          {
            loading: 'جاري إضافة العميل...',
            success: 'تم إضافة العميل بنجاح!',
            error: 'عذراً، حدث خطأ أثناء إضافة العميل.'
          }
        );

        // Merge Supabase result with local-only fields
        const customer = {
          ...saved,
          totalSpent: 0,
          orders: 0,
          joinDate: getCurrentDate().split('T')[0],
          status: 'جديد',
          businessActivity: formData.businessActivity || '',
          usualProduct: formData.usualProduct || '',
          sizeWidth: String(parseFloat(formData.sizeWidth) || 0),
          sizeHeight: String(parseFloat(formData.sizeHeight) || 0),
          bagSizes: formData.bagSizes || [],
          clicheWidth: String(parseFloat(formData.clicheWidth) || 0),
          clicheHeight: String(parseFloat(formData.clicheHeight) || 0),
          cliche: (formData.clicheWidth && formData.clicheHeight)
            ? `${formData.clicheHeight} × ${formData.clicheWidth}`
            : (formData.cliche || ''),
          colorCount: String(parseFloat(formData.colorCount) || 0),
          notes: formData.notes || ''
        };

        setCustomers(prev => {
          const updated = [...prev, customer];
          localStorage.setItem('customers', JSON.stringify(updated));
          return updated;
        });

        publish(EVENTS.CUSTOMERS_CHANGED, { type: 'create', customer });

        setShowAddModal(false);
        soundManager.play('save');
      } catch (error) {
        console.error('Failed to add customer:', error);
      }
    } else {
      toast.error('يرجى إدخال اسم العميل ورقم هاتفه');
      soundManager.play('error');
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setShowAddModal(true);
  };

  const handleUpdateCustomer = async (formData) => {
    if (editingCustomer && formData.name && formData.phone) {
      try {
        // بناء الكائن الكامل أولاً ليشمل profileCliches والأكلشي المحسوب
        const updatedCustomer = {
          ...editingCustomer,
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          businessActivity: formData.businessActivity || '',
          usualProduct: formData.usualProduct || '',
          sizeWidth: String(parseFloat(formData.sizeWidth) || 0),
          sizeHeight: String(parseFloat(formData.sizeHeight) || 0),
          bagSizes: formData.bagSizes || [],
          clicheWidth: String(parseFloat(formData.clicheWidth) || 0),
          clicheHeight: String(parseFloat(formData.clicheHeight) || 0),
          cliche: (formData.clicheWidth && formData.clicheHeight)
            ? `${formData.clicheHeight} × ${formData.clicheWidth}`
            : (formData.cliche || ''),
          colorCount: String(parseFloat(formData.colorCount) || 0),
          notes: formData.notes || '',
          // الحفاظ على الأكلاشيهات الإضافية عند تحديث بيانات العميل
          profileCliches: editingCustomer.profileCliches || []
        };

        // إرسال الكائن الكامل لـ Supabase (يشمل profileCliches)
        await toast.promise(
          supabaseService.updateCustomer(editingCustomer.id, updatedCustomer),
          {
            loading: 'جاري تحديث بيانات العميل...',
            success: 'تم تحديث البيانات بنجاح!',
            error: 'عذراً، فشل تحديث بيانات العميل.'
          }
        );

        setCustomers(prev => {
          const updated = prev.map(c => c.id === editingCustomer.id ? updatedCustomer : c);
          localStorage.setItem('customers', JSON.stringify(updated));
          return updated;
        });

        publish(EVENTS.CUSTOMERS_CHANGED, { type: 'update', customer: updatedCustomer });

        setEditingCustomer(null);
        setShowAddModal(false);
        soundManager.play('save');
      } catch (error) {
        console.error('Failed to update customer:', error);
      }
    } else {
      toast.error('يرجى إدخال البيانات المطلوبة');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      try {
        await toast.promise(
          supabaseService.deleteCustomer(id),
          {
            loading: 'جاري حذف العميل...',
            success: 'تم حذف العميل بنجاح!',
            error: 'حدث خطأ أثناء محاولة الحذف.'
          }
        );
        setCustomers(prev => {
          const updated = prev.filter(c => c.id !== id);
          localStorage.setItem('customers', JSON.stringify(updated));

          // Also delete associated orders and payments for data integrity
          const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
          const filteredOrders = allOrders.filter(o => o.customerId?.toString() !== id.toString());
          localStorage.setItem('customer_orders', JSON.stringify(filteredOrders));

          const allPayments = JSON.parse(localStorage.getItem('customer_payments') || '[]');
          const filteredPayments = allPayments.filter(p => p.customerId?.toString() !== id.toString());
          localStorage.setItem('customer_payments', JSON.stringify(filteredPayments));

          return updated;
        });

        publish(EVENTS.CUSTOMERS_CHANGED, { type: 'delete', customerId: id });
        publish(EVENTS.CUSTOMER_ORDERS_CHANGED, { type: 'delete_bulk' });
        soundManager.play('delete');
      } catch (error) {
        console.error('Failed to delete customer:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'VIP': return 'bg-purple-100 text-purple-800';
      case 'نشط': return 'bg-green-100 text-green-800';
      case 'جديد': return 'bg-blue-100 text-blue-800';
      case 'غير نشط': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const topCustomers = customers
    .filter(c => (parseFloat(c.totalQuantity) || 0) >= 5000) // شرط الـ 5 طن
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // الاشتراك في أحداث تغيير العملاء من صفحات أخرى
  useEffect(() => {
    const reloadCustomers = () => {
      const savedCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
      setCustomers(savedCustomers);
      console.log('🔄 تم إعادة تحميل العملاء:', savedCustomers.length);
    };

    // الاشتراك في أحداث تغيير العملاء
    const unsubscribe = subscribe(EVENTS.CUSTOMERS_CHANGED, (payload) => {
      console.log('📨 استقبال حدث تغيير العملاء:', payload);
      reloadCustomers();
    });

    // الاشتراك في أحداث استيراد البيانات
    const unsubscribeImport = subscribe(EVENTS.DATA_IMPORTED, (payload) => {
      if (payload.includes?.('customers')) {
        console.log('📨 استقبال حدث استيراد العملاء');
        reloadCustomers();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeImport();
    };
  }, []);

  const filteredCustomers = customers.filter(customer => {
    const name = customer.name || '';
    const phone = customer.phone || '';
    const email = customer.email || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'الكل' || customer.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F3F4F9] relative overflow-hidden">
      {/* Background Animation - Stabilized */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-40 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center  space-y-4 md:space-y-0">
          <div className="flex-1">
            <h1 className="text-sm md:text-base lg:text-lg xl:text-xl font-bold text-slate-900 mb-2 md:mb-3">
              إدارة العملاء
            </h1>
            <p className="text-slate-600 text-xs md:text-xs lg:text-sm xl:text-sm font-medium">إدارة بيانات عملاء مصنع Elking Plast</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { soundManager.play('openWindow'); navigate('/cliches'); }}
              className="bg-white bg-opacity-10 border border-[#5235E8] border-opacity-30 text-[#5235E8] flex items-center px-4 py-3 rounded-xl text-sm font-bold hover:bg-[#5235E8] hover:text-white transition-all duration-300"
            >
              <Layers className="h-5 w-5 mr-3" />
              مخزون الأكلشيهات
            </button>
            <button
              onClick={() => { soundManager.play('openWindow'); setShowAddModal(true); }}
              className="btn-primary flex items-center px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm lg:text-sm font-semibold"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
              إضافة عميل جديد
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4 mb-8 mt-4">
          <div className="glass-card group cursor-pointer p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] md:text-xs font-medium text-[#006af8] mb-1 uppercase tracking-wide truncate">إجمالي العملاء</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-1 truncate">{customers.length}</p>
                <div className="flex items-center text-[10px] md:text-[11px]">
                  <span className="text-blue-300 font-medium truncate">عملاء مسجلون</span>
                </div>
              </div>
              <div className="flex-shrink-0 p-2 md:p-2.5 lg:p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-sm">
                <Users className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card group cursor-pointer p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] md:text-xs font-medium text-[#006af8] mb-1 uppercase tracking-wide truncate">عملاء VIP</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-1 truncate">
                  {customers.filter(c => c.status === 'VIP').length}
                </p>
                <div className="flex items-center text-[10px] md:text-[11px]">
                  <span className="text-slate-500 font-medium truncate">عملاء مميزون</span>
                </div>
              </div>
              <div className="flex-shrink-0 p-2 md:p-2.5 lg:p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl shadow-sm">
                <Star className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card group cursor-pointer p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] md:text-xs font-medium text-[#006af8] mb-1 uppercase tracking-wide truncate">متوسط الشراء</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-1 truncate">
                  ${Math.round(customers.reduce((total, c) => safeMath.add(total, c.totalSpent), 0) / (customers.length || 1))}
                </p>
                <div className="flex items-center text-[10px] md:text-[11px]">
                  <span className="text-green-300 font-medium truncate">كقيمة للمشتريات</span>
                </div>
              </div>
              <div className="flex-shrink-0 p-2 md:p-2.5 lg:p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-sm">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card group cursor-pointer p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] md:text-xs font-medium text-[#006af8] mb-1 uppercase tracking-wide truncate">عملاء جدد</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-1 truncate">
                  {customers.filter(c => c.status === 'جديد').length}
                </p>
                <div className="flex items-center text-[10px] md:text-[11px]">
                  <span className="text-orange-300 font-medium truncate">هذا الشهر</span>
                </div>
              </div>
              <div className="flex-shrink-0 p-2 md:p-2.5 lg:p-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl shadow-sm">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card group cursor-pointer p-3 md:p-4 border-r-4 border-blue-400">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] md:text-[11px] font-medium text-blue-300 mb-1 uppercase tracking-wide truncate">إجمالي الكمية (كجم)</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-1 truncate">
                  {customers.reduce((total, c) => total + (c.totalQuantity || 0), 0).toLocaleString()}
                </p>
                <div className="flex items-center text-[10px] md:text-[11px]">
                  <span className="text-slate-300 font-medium truncate">المسلمة للعملاء</span>
                </div>
              </div>
              <div className="flex-shrink-0 p-2 md:p-2.5 lg:p-3 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl shadow-sm">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card group cursor-pointer p-3 md:p-4 border-r-4 border-red-400">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] md:text-[11px] font-medium text-red-300 mb-1 uppercase tracking-wide truncate">إجمالي الهالك (كجم)</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-1 truncate">
                  {customers.reduce((total, c) => total + (c.totalWaste || 0), 0).toLocaleString()}
                </p>
                <div className="flex items-center text-[10px] md:text-[11px]">
                  <span className="text-slate-300 font-medium truncate">المرتجع / الهالك</span>
                </div>
              </div>
              <div className="flex-shrink-0 p-2 md:p-2.5 lg:p-3 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Trash2 className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Customers */}
        <div className="glass-card mb-4 md:mb-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-lg font-bold text-white">أفضل العملاء</h3>
            <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg shadow-md">
              <Star className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            {topCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all duration-300">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">{customer.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Phone className="h-3 w-3 text-green-400" />
                      <p className="text-sm text-green-300 font-medium bg-green-500 bg-opacity-20 px-2 py-1 rounded-full">{customer.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-400 bg-emerald-500 bg-opacity-20 px-3 py-1 rounded-full">
                    ${customer.totalSpent}
                  </div>
                  <div className="text-xs text-orange-300 bg-orange-500 bg-opacity-20 px-2 py-1 rounded-full mt-1">
                    {customer.orders} طلب
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-5 w-5" />
              <input
                type="text"
                placeholder="البحث بالاسم أو الهاتف أو الملاحظات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-3 text-right bg-white bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400 focus:border-opacity-60"
              />
            </div>

            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 h-5 w-5" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="pr-10 pl-4 py-3 text-right appearance-none bg-white bg-opacity-10 border border-purple-500 border-opacity-30 rounded-lg text-white focus:outline-none focus:border-purple-400 focus:border-opacity-60"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <button className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 flex items-center border border-gray-500 border-opacity-30">
              <Download className="h-5 w-5 mr-2" />
              تصدير
            </button>

            <button className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 flex items-center border border-green-500 border-opacity-30">
              <Upload className="h-5 w-5 mr-2" />
              استيراد
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="glass-card overflow-hidden table-enhanced">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="bg-[#f8fafc] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">العميل</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">الاتصال</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider hidden xl:table-cell">النشاط / المنتج</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider hidden 2xl:table-cell">مقاس المنتج</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider hidden lg:table-cell">الاستهلاك والهالك (كجم)</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">المشتريات</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">الحالة</th>
                  <th className="px-3 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[130px]">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-slate-100">
                    {/* Customer Name */}
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center ml-3 shadow-lg flex-shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-black">{customer.name}</div>
                          <div className="text-xs text-blue-300 bg-blue-500 bg-opacity-20 px-2 py-0.5 rounded-full inline-block mt-1">
                            انضم: {customer.joinDate}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-3 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-green-400 flex-shrink-0" />
                          <span className="text-xs font-semibold text-green-300 bg-green-500 bg-opacity-20 px-2 py-0.5 rounded-full">{customer.phone}</span>
                        </div>
                        {customer.notes && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-purple-400 flex-shrink-0" />
                            <span className="text-xs text-slate-500 max-w-[150px] truncate" title={customer.notes}>{customer.notes}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Business Activity + Usual Product */}
                    <td className="px-3 py-4 hidden xl:table-cell">
                      <div className="space-y-1">
                        {customer.businessActivity ? (
                          <div className="text-xs font-bold text-slate-700 bg-slate-200 bg-opacity-50 px-2 py-0.5 rounded-full inline-block">{customer.businessActivity}</div>
                        ) : null}
                        {customer.usualProduct ? (
                          <div className="text-xs font-medium text-slate-600">{customer.usualProduct}</div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                    {/* Product Size */}
                    <td className="px-3 py-4 whitespace-nowrap hidden 2xl:table-cell">
                      <div className="space-y-1">
                          <div className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md inline-block">
                              {(() => {
                                  // 1. Show size from customer profile if exists
                                  if (customer.sizeWidth && customer.sizeHeight) {
                                      return `${customer.sizeWidth} × ${customer.sizeHeight} سم`;
                                  }
                                  
                                  // 2. Fallback to latest order size 
                                  const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
                                  const userOrders = allOrders.filter(o => String(o.customerId) === String(customer.id));
                                  if (userOrders.length > 0) {
                                      const lastOrder = userOrders[userOrders.length - 1];
                                      if (lastOrder.sizeWidth && lastOrder.sizeHeight) return `${lastOrder.sizeWidth} × ${lastOrder.sizeHeight} سم`;
                                      if (lastOrder.size) return lastOrder.size;
                                  }
                                  return '—';
                              })()}
                          </div>
                      </div>
                    </td>
                    {/* Quantity & Waste */}
                    <td className="px-3 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md mb-1 border border-blue-200 shadow-sm flex items-center justify-between">
                          <span>الكمية:</span> <span>{customer.totalQuantity || 0} كجم</span>
                      </div>
                      <div className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-md border border-rose-200 shadow-sm flex items-center justify-between">
                          <span>الهالك:</span> <span>{customer.totalWaste || 0} كجم</span>
                      </div>
                    </td>
                    {/* Total Spent */}
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-emerald-400 bg-emerald-500 bg-opacity-20 px-3 py-1 rounded-full inline-block">
                        ${customer.totalSpent}
                      </div>
                      <div className="text-xs text-orange-400 mt-1">{customer.orders} طلب</div>
                    </td>
                    {/* Status */}
                    <td className="px-3 py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium min-w-[130px]">
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => { soundManager.play('openWindow'); navigate(`/customers/${customer.id}`); }}
                          className="action-button text-purple-600 bg-purple-100 hover:bg-purple-200"
                          title="عرض الطلبات والتفاصيل"
                        >
                          <FileText className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => { soundManager.play('update'); handleEditCustomer(customer); }}
                          className="action-button text-blue-600 bg-blue-100 hover:bg-blue-200"
                          title="تعديل العميل"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => { soundManager.play('delete'); handleDeleteCustomer(customer.id); }}
                          className="action-button text-red-600 bg-red-100 hover:bg-red-200"
                          title="حذف العميل"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add/Edit Customer Modal */}
      <AddCustomerModal
        show={showAddModal}
        editingCustomer={editingCustomer}
        onClose={() => {
          soundManager.play('closeWindow');
          setShowAddModal(false);
          setEditingCustomer(null);
        }}
        onSave={(data) => {
          if (editingCustomer) {
            handleUpdateCustomer(data);
          } else {
            handleAddCustomer(data);
          }
        }}
      />
    </div>
  );
};

// Extracted component to isolate form state and prevent parent re-renders
const AddCustomerModal = ({ show, editingCustomer, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
    address: '',
    businessActivity: '',
    usualProduct: '',
    sizeWidth: '',
    sizeHeight: '',
    bagSizes: [],
    cliche: '',
    clicheWidth: '',
    clicheHeight: '',
    colorCount: ''
  });

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || '',
        phone: editingCustomer.phone || '',
        notes: editingCustomer.notes || '',
        address: editingCustomer.address || '',
        businessActivity: editingCustomer.businessActivity || '',
        usualProduct: editingCustomer.usualProduct || '',
        sizeWidth: editingCustomer.sizeWidth || '',
        sizeHeight: editingCustomer.sizeHeight || '',
        bagSizes: editingCustomer.bagSizes || [],
        cliche: editingCustomer.cliche || '',
        clicheWidth: editingCustomer.clicheWidth || '',
        clicheHeight: editingCustomer.clicheHeight || '',
        colorCount: editingCustomer.colorCount || ''
      });
    } else {
      setFormData({
        name: '', phone: '', notes: '', address: '',
        businessActivity: '', usualProduct: '', 
        sizeWidth: '', sizeHeight: '', bagSizes: [],
        cliche: '', clicheWidth: '', clicheHeight: '', colorCount: ''
      });
    }
  }, [editingCustomer, show]);

  const handleAddSize = () => {
    setFormData(prev => ({
      ...prev,
      bagSizes: [...(prev.bagSizes || []), { id: Date.now(), width: '', length: '' }]
    }));
  };

  const handleRemoveSize = (id) => {
    setFormData(prev => ({
      ...prev,
      bagSizes: prev.bagSizes.filter(s => s.id !== id)
    }));
  };

  const handleSizeChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      bagSizes: prev.bagSizes.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
    }));
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-0 sm:p-4"
      onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="p-6 pb-0 flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex flex-row items-center gap-2">
            <User className="h-6 w-6 text-purple-600" />
            {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-100 hover:bg-slate-200 rounded-full">
            <Plus className="h-5 w-5 rotate-45" />
          </button>
        </div>

        <div className="flex-1 p-6 pt-2 space-y-5">
          {/* Row 1: Name + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">اسم العميل <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="اسم العميل أو الشركة"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">رقم الهاتف <span className="text-red-500">*</span></label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-slate-100 my-4"></div>

          {/* Row 2: Business Activity + Usual Product + Color Count */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">النشاط التجاري</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="تجارة، مصنع..."
                  value={formData.businessActivity}
                  onChange={(e) => setFormData({ ...formData, businessActivity: e.target.value })}
                  className="w-full pr-10 pl-3 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">المنتج المعتاد</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Tag className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="شنط، أكياس..."
                  value={formData.usualProduct}
                  onChange={(e) => setFormData({ ...formData, usualProduct: e.target.value })}
                  className="w-full pr-10 pl-3 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">عدد الألوان</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Palette className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="3"
                  value={formData.colorCount}
                  onChange={(e) => setFormData({ ...formData, colorCount: e.target.value })}
                  className="w-full pr-10 pl-3 py-2.5 text-right direction-ltr border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Product Size Width × Height */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 align-right">عرض المنتج المعتاد (سم)</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Hash className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="number"
                  placeholder="مثال: 30"
                  value={formData.sizeWidth}
                  onChange={(e) => setFormData({ ...formData, sizeWidth: e.target.value })}
                  className="w-full pr-10 pl-3 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">طول المنتج المعتاد (سم)</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Hash className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="number"
                  placeholder="مثال: 40"
                  value={formData.sizeHeight}
                  onChange={(e) => setFormData({ ...formData, sizeHeight: e.target.value })}
                  className="w-full pr-10 pl-3 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Bag Sizes List */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-bold text-slate-700 flex items-center gap-1">
                <Hash className="h-4 w-4 text-purple-600" />
                مقاسات إضافية
              </label>
              <button
                type="button"
                onClick={handleAddSize}
                className="text-xs font-bold text-purple-600 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                title="إضافة مقاس آخر"
              >
                <Plus className="h-3 w-3" />
                إضافة مقاس
              </button>
            </div>
            
            <div className="space-y-3">
              {(!formData.bagSizes || formData.bagSizes.length === 0) && (
                <div className="text-center py-4 text-xs font-medium text-slate-400 bg-white border border-slate-100 rounded-lg">
                  لا توجد مقاسات إضافية. يمكنك إضافة مقاسات متعددة للعميل من هنا.
                </div>
              )}
              
              {formData.bagSizes?.map((size, index) => (
                <div key={size.id || index} className="flex flex-row items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1">عرض (سم)</label>
                    <input
                      type="number"
                      placeholder="مثال: 30"
                      value={size.width || ''}
                      onChange={(e) => handleSizeChange(size.id, 'width', e.target.value)}
                      className="w-full px-3 py-2 text-right border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-purple-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1">طول (سم)</label>
                    <input
                      type="number"
                      placeholder="مثال: 40"
                      value={size.length || size.height || ''}
                      onChange={(e) => handleSizeChange(size.id, 'length', e.target.value)}
                      className="w-full px-3 py-2 text-right border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-purple-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={() => handleRemoveSize(size.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="حذف المقاس"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-slate-100 my-4"></div>

          {/* Row 4: Cliche Width × Cliche Height */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 align-right">عرض الأكلشية الأساسي (سم)</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Layers className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="number"
                  placeholder="مثال: 60"
                  value={formData.clicheWidth}
                  onChange={(e) => setFormData({ ...formData, clicheWidth: e.target.value })}
                  className="w-full pr-10 pl-3 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">طول الأكلشية الأساسي (سم)</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Layers className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="number"
                  placeholder="مثال: 40"
                  value={formData.clicheHeight}
                  onChange={(e) => setFormData({ ...formData, clicheHeight: e.target.value })}
                  className="w-full pr-10 pl-3 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-slate-100 my-4"></div>

          {/* Row 4: Notes + Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <FileText className="w-4 h-4 text-purple-600" />
                ملاحظات
              </label>
              <textarea
                placeholder="أي ملاحظات إضافية عن العميل..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="1"
                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white resize-none"
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">العنوان</label>
              <input
                type="text"
                placeholder="تفاصيل العنوان"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 p-6 pt-4 border-t border-slate-100 bg-slate-50 mt-auto">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 text-slate-600 bg-white border border-slate-200 font-bold hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-all order-2 sm:order-1"
          >
            إلغاء
          </button>
          <button
            onClick={() => onSave(formData)}
            className="w-full sm:w-auto btn-primary px-8 py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all order-1 sm:order-2"
          >
            {editingCustomer ? 'تحديث البيانات' : 'إضافة العميل'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Customers;
