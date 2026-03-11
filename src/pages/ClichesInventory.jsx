import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Layers,
    Search,
    ArrowRight,
    User,
    Maximize2,
    Hash,
    Filter,
    ClipboardList,
    Package,
    Plus,
    Clock
} from 'lucide-react';
import soundManager from '../utils/soundManager';
import { subscribe, EVENTS } from '../utils/observerManager';
import supabaseService from '../utils/supabaseService';

const ClichesInventory = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        try {
            setLoading(true);
            // localStorage is already kept up-to-date by the Supabase Realtime handler
            // so reading from it gives us merged cloud+local data at all times
            const localCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
            setCustomers(localCustomers);
        } catch (error) {
            console.error('Error loading cliches inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial load: fetch fresh from Supabase then read local
        supabaseService.getCustomers().then(() => loadData()).catch(() => loadData());

        const unsubCustomers = subscribe(EVENTS.CUSTOMERS_CHANGED, loadData);
        const unsubOrders = subscribe(EVENTS.CUSTOMER_ORDERS_CHANGED, loadData);
        return () => {
            unsubCustomers();
            unsubOrders();
        };
    }, []);

    // Flatten all cliches from all customers
    const allCliches = customers.reduce((acc, customer) => {
        // Main cliche from customer profile
        if (customer.cliche && customer.cliche !== 'غير محدد') {
            acc.push({
                id: `main-${customer.id}`,
                name: 'الأكلشية الأساسي',
                dimensions: customer.cliche,
                customerName: customer.name,
                customerId: customer.id,
                isMain: true
            });
        }

        // Additional cliches from profileCliches array
        if (Array.isArray(customer.profileCliches)) {
            customer.profileCliches.forEach(cliche => {
                acc.push({
                    ...cliche,
                    customerName: customer.name,
                    customerId: customer.id,
                    isMain: false
                });
            });
        }

        return acc;
    }, []);

    const filteredCliches = allCliches.filter(cliche =>
        cliche.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliche.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliche.dimensions.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Grouping by customer for stats
    const customerStats = customers.map(c => {
        const count = (c.cliche && c.cliche !== 'غير محدد' ? 1 : 0) + (Array.isArray(c.profileCliches) ? c.profileCliches.length : 0);
        return { name: c.name, count };
    }).filter(s => s.count > 0);

    return (
        <div className="min-h-screen bg-[#F3F4F9] relative overflow-hidden pb-10 font-arabic rtl" dir="rtl">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5" />
            </div>

            <div className="relative z-10 p-4 md:p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => navigate('/customers')}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all text-slate-600"
                            >
                                <ArrowRight className="h-6 w-6" />
                            </button>
                            <h1 className="text-2xl font-bold text-slate-900">مخزون الأكلشيهات</h1>
                        </div>
                        <p className="text-slate-500 text-sm mr-11">إحصائيات ومتابعة جميع الأكلشيهات المتوفرة بالمصنع</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="ابحث باسم العميل أو الأكلشية..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5235E8] transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 border-r-4 border-purple-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-slate-500 text-sm mb-1 uppercase font-bold">إجمالي الأكلشيهات</p>
                                <p className="text-3xl font-black text-slate-800">{allCliches.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                                <Layers className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 border-r-4 border-blue-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-slate-500 text-sm mb-1 uppercase font-bold">عملاء لديهم أكلشيهات</p>
                                <p className="text-3xl font-black text-slate-800">{customerStats.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                                <User className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 border-r-4 border-emerald-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-slate-500 text-sm mb-1 uppercase font-bold">الأكلشيهات الجديدة (هذا الشهر)</p>
                                <p className="text-3xl font-black text-slate-800">0</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                                <Plus className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="glass-card overflow-hidden">
                    {loading ? (
                        <div className="p-20 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5235E8] mx-auto"></div>
                            <p className="mt-4 text-slate-500">جاري تحميل البيانات...</p>
                        </div>
                    ) : filteredCliches.length === 0 ? (
                        <div className="p-20 text-center bg-slate-50">
                            <Package className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">لا توجد أكلشيهات تطابق بحثك</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">العميل</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">اسم الأكلشية</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">المقاس (طول × عرض)</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">النوع</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredCliches.map((cliche) => (
                                        <tr key={cliche.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-[#5235E8] bg-opacity-10 rounded-full flex items-center justify-center text-[#5235E8] font-bold text-xs">
                                                        {cliche.customerName.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-700">{cliche.customerName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 font-medium">{cliche.name}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-slate-800 font-bold">
                                                    <Maximize2 className="h-4 w-4 text-slate-400" />
                                                    {cliche.dimensions}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {cliche.isMain ? (
                                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">أساسي</span>
                                                ) : (
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">إضافي</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => navigate(`/customers/${cliche.customerId}`)}
                                                    className="p-2 text-slate-400 hover:text-[#5235E8] hover:bg-slate-100 rounded-lg transition-all"
                                                    title="عرض ملف العميل"
                                                >
                                                    <ArrowRight className="h-5 w-5 rtl:rotate-180" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Bottom Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-indigo-500" />
                            توزيع الأكلشيهات لكل عميل
                        </h3>
                        <div className="space-y-3">
                            {customerStats.sort((a, b) => b.count - a.count).slice(0, 5).map((stat, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <span className="font-bold text-slate-700">{stat.name}</span>
                                    <span className="bg-[#5235E8] text-white px-3 py-1 rounded-lg text-xs font-bold">{stat.count} أكلشيه</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6 bg-gradient-to-br from-[#5235E8] to-[#3a23a8] text-white">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Hash className="h-5 w-5 opacity-70" />
                            ملاحظات المخزن
                        </h3>
                        <div className="space-y-2 opacity-90 text-sm">
                            <p>• يتم تحديث هذه البيانات تلقائياً عند إضافة أي أكلشيه جديد لملف العميل.</p>
                            <p>• الأكلشيه الأساسي هو الذي يتم تسجيله مع بيانات العميل لأول مرة.</p>
                            <p>• الأكلشيهات الإضافية تظهر في سجل العميل ضمن التغييرات الدورية.</p>
                        </div>
                        <button
                            onClick={() => navigate('/customers')}
                            className="mt-6 w-full py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl font-bold transition-all"
                        >
                            تعديل بيانات عميل
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClichesInventory;
