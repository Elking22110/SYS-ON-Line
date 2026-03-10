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
  Hash
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

      const savedCustomers = (supabaseCustomers && supabaseCustomers.length > 0)
        ? supabaseCustomers
        : JSON.parse(localStorage.getItem('customers') || '[]');

      // تحديث حالة العميل التلقائي
      const updatedCustomers = savedCustomers.map(customer => {
        let status = customer.status;
        const totalAmount = parseFloat(customer.totalAmount || customer.totalSpent) || 0;
        const ordersCount = parseInt(customer.ordersCount || customer.orders) || 0;

        if (totalAmount >= 5000) {
          status = 'VIP';
        } else if (totalAmount >= 2000) {
          status = 'نشط';
        } else if (ordersCount === 1) {
          status = 'جديد';
        }

        return {
          ...customer,
          status,
          totalSpent: totalAmount,
          orders: ordersCount,
          joinDate: customer.createdAt ? customer.createdAt.split('T')[0] : customer.joinDate
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
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
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
          cliche: formData.cliche || '',
          clicheCode: formData.clicheCode || '',
          colorCount: formData.colorCount || '',
          notes: formData.notes || ''
        };

        const updatedCustomers = [...customers, customer];
        setCustomers(updatedCustomers);
        localStorage.setItem('customers', JSON.stringify(updatedCustomers));

        publish(EVENTS.CUSTOMERS_CHANGED, { type: 'create', customer, customers: updatedCustomers });

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
        await toast.promise(
          supabaseService.updateCustomer(editingCustomer.id, {
            name: formData.name,
            phone: formData.phone,
            address: formData.address
          }),
          {
            loading: 'جاري تحديث بيانات العميل...',
            success: 'تم تحديث البيانات بنجاح!',
            error: 'عذراً، فشل تحديث بيانات العميل.'
          }
        );

        // Merge all fields including local-only ones
        const updatedCustomer = {
          ...editingCustomer,
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          businessActivity: formData.businessActivity || '',
          usualProduct: formData.usualProduct || '',
          cliche: formData.cliche || '',
          clicheCode: formData.clicheCode || '',
          colorCount: formData.colorCount || '',
          notes: formData.notes || ''
        };
        const updatedCustomers = customers.map(c => c.id === editingCustomer.id ? updatedCustomer : c);
        setCustomers(updatedCustomers);
        localStorage.setItem('customers', JSON.stringify(updatedCustomers));

        publish(EVENTS.CUSTOMERS_CHANGED, { type: 'update', customer: updatedCustomer, customers: updatedCustomers });

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
        const updatedCustomers = customers.filter(c => c.id !== id);
        setCustomers(updatedCustomers);
        localStorage.setItem('customers', JSON.stringify(updatedCustomers));

        publish(EVENTS.CUSTOMERS_CHANGED, { type: 'delete', customerId: id, customers: updatedCustomers });
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
          <button
            onClick={() => { soundManager.play('openWindow'); setShowAddModal(true); }}
            className="btn-primary flex items-center px-3 md:px-4 py-2 md:py-3 text-xs md:text-xs lg:text-sm font-semibold"
          >
            <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
            إضافة عميل جديد
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6 xl:gap-8">
          <div className="glass-card group cursor-pointer p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-[#006af8] mb-1 md:mb-2 uppercase tracking-wide">إجمالي العملاء</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3">{customers.length}</p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-blue-300 font-medium">عملاء مسجلون</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <User className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card group cursor-pointer p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-[#006af8] mb-1 md:mb-2 uppercase tracking-wide">عملاء VIP</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3">
                  {customers.filter(c => c.status === 'VIP').length}
                </p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-slate-500 font-medium">عملاء مميزون</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Star className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card group cursor-pointer p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-[#006af8] mb-1 md:mb-2 uppercase tracking-wide">متوسط قيمة المشتريات</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3">
                  ${Math.round(customers.reduce((total, c) => safeMath.add(total, c.totalSpent), 0) / (customers.length || 1))}
                </p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-green-300 font-medium">متوسط المشتريات</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <DollarSign className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card group cursor-pointer p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-[#006af8] mb-1 md:mb-2 uppercase tracking-wide">عملاء جدد هذا الشهر</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3">
                  {customers.filter(c => c.status === 'جديد').length}
                </p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-orange-300 font-medium">عملاء جدد</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Calendar className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-white" />
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

            <button className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300 flex items-center border border-gray-500 border-opacity-30 hover:scale-105">
              <Download className="h-5 w-5 mr-2" />
              تصدير
            </button>

            <button className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center border border-green-500 border-opacity-30 hover:scale-105">
              <Upload className="h-5 w-5 mr-2" />
              استيراد
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="glass-card overflow-hidden table-enhanced">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8fafc] border-b border-slate-200">
                <tr>
                  <th className="px-4 md:px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">العميل</th>
                  <th className="px-4 md:px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الاتصال</th>
                  <th className="px-4 md:px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">النشاط / المنتج</th>
                  <th className="px-4 md:px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الأكلشية</th>
                  <th className="px-4 md:px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">المشتريات</th>
                  <th className="px-4 md:px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الحالة</th>
                  <th className="px-4 md:px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    {/* Customer Name */}
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center ml-3 shadow-lg flex-shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{customer.name}</div>
                          <div className="text-xs text-blue-300 bg-blue-500 bg-opacity-20 px-2 py-0.5 rounded-full inline-block mt-1">
                            انضم: {customer.joinDate}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
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
                    <td className="px-4 md:px-6 py-4">
                      <div className="space-y-1">
                        {customer.businessActivity ? (
                          <div className="text-xs font-bold text-slate-700 bg-slate-200 bg-opacity-50 px-2 py-0.5 rounded-full inline-block">{customer.businessActivity}</div>
                        ) : null}
                        {customer.usualProduct ? (
                          <div className="text-xs font-medium text-slate-600">{customer.usualProduct}</div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                    {/* Cliche */}
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {customer.cliche ? (
                          <div className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md inline-block">{customer.cliche}</div>
                        ) : null}
                        {customer.clicheCode ? (
                          <div className="text-xs text-slate-600 font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center inline-flex gap-1">
                            <Hash className="w-3 h-3 text-slate-400" /> {customer.clicheCode}
                          </div>
                        ) : null}
                        {customer.colorCount ? (
                          <div className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full inline-block">{customer.colorCount} لون</div>
                        ) : null}
                        {!customer.cliche && !customer.clicheCode && !customer.colorCount && <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                    {/* Total Spent */}
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-emerald-400 bg-emerald-500 bg-opacity-20 px-3 py-1 rounded-full inline-block">
                        ${customer.totalSpent}
                      </div>
                      <div className="text-xs text-orange-400 mt-1">{customer.orders} طلب</div>
                    </td>
                    {/* Status */}
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => { soundManager.play('openWindow'); navigate(`/customers/${customer.id}`); }}
                          className="text-purple-400 hover:text-purple-300 transition-colors p-2 hover:bg-purple-500 hover:bg-opacity-20 rounded-lg"
                          title="عرض الطلبات والتفاصيل"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { soundManager.play('update'); handleEditCustomer(customer); }}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-2 hover:bg-blue-500 hover:bg-opacity-20 rounded-lg"
                          title="تعديل العميل"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { soundManager.play('delete'); handleDeleteCustomer(customer.id); }}
                          className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500 hover:bg-opacity-20 rounded-lg"
                          title="حذف العميل"
                        >
                          <Trash2 className="h-4 w-4" />
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
    cliche: '',
    clicheCode: '',
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
        cliche: editingCustomer.cliche || '',
        clicheCode: editingCustomer.clicheCode || '',
        colorCount: editingCustomer.colorCount || ''
      });
    } else {
      setFormData({
        name: '', phone: '', notes: '', address: '',
        businessActivity: '', usualProduct: '', cliche: '', clicheCode: '', colorCount: ''
      });
    }
  }, [editingCustomer, show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-[9999] backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex flex-row items-center gap-2">
            <User className="h-6 w-6 text-purple-600" />
            {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-100 hover:bg-slate-200 rounded-full">
            <Plus className="h-5 w-5 rotate-45" />
          </button>
        </div>

        <div className="space-y-5">
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

          {/* Row 3: Cliche + Cliche Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">الأكلشية</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Layers className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="اسم الأكلشية"
                  value={formData.cliche}
                  onChange={(e) => setFormData({ ...formData, cliche: e.target.value })}
                  className="w-full pr-10 pl-3 py-2.5 text-right border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">كود الأكلشية</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Hash className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="CLX-001"
                  value={formData.clicheCode}
                  onChange={(e) => setFormData({ ...formData, clicheCode: e.target.value })}
                  className="w-full pr-10 pl-3 py-2.5 text-right font-mono border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50 focus:bg-white"
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

        <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-600 bg-slate-100 font-bold hover:bg-slate-200 hover:text-slate-800 rounded-xl transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={() => onSave(formData)}
            className="btn-primary px-8 py-2.5 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            {editingCustomer ? 'تحديث البيانات' : 'إضافة العميل'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Customers;
