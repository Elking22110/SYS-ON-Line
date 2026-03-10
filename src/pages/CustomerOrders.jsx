import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    User,
    Phone,
    Mail,
    Plus,
    Package,
    Trash2,
    Edit,
    Link2,
    Clock,
    CheckCircle,
    XCircle,
    Loader,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Briefcase,
    Tag,
    Layers,
    Palette,
    Hash,
    Truck,
    FileText
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import supabaseService from '../utils/supabaseService';
import toast from 'react-hot-toast';

const ORDER_STATUSES = [
    { value: 'OPEN', label: 'مفتوح', color: 'bg-blue-500 bg-opacity-20 text-blue-300', icon: Clock },
    { value: 'IN_PRODUCTION', label: 'في الإنتاج', color: 'bg-yellow-500 bg-opacity-20 text-yellow-300', icon: Loader },
    { value: 'DONE', label: 'منتهي', color: 'bg-green-500 bg-opacity-20 text-green-400', icon: CheckCircle },
    { value: 'CLOSED', label: 'مغلق', color: 'bg-gray-500 bg-opacity-20 text-gray-400', icon: XCircle },
];

// Generate sequential order number
const generateOrderNumber = () => {
    const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
    const maxNum = allOrders.reduce((max, o) => {
        const num = parseInt((o.orderNumber || '').replace('ORD-', '')) || 0;
        return Math.max(max, num);
    }, 100);
    return `ORD-${maxNum + 1}`;
};

const emptyFormTemplate = {
    productType: '',
    color: '',
    size: '',
    quantity: '',
    colorCount: '',
    notes: '',
    status: 'OPEN',
};

const AddOrderModal = ({ show, editingOrder, onClose, onSave }) => {
    const [form, setForm] = useState(emptyFormTemplate);

    useEffect(() => {
        if (show) {
            if (editingOrder) {
                setForm({
                    productType: editingOrder.productType || '',
                    color: editingOrder.color || '',
                    size: editingOrder.size || '',
                    quantity: editingOrder.quantity?.toString() || '',
                    colorCount: editingOrder.colorCount?.toString() || '',
                    notes: editingOrder.notes || '',
                    status: editingOrder.status || 'OPEN',
                });
            } else {
                setForm(emptyFormTemplate);
            }
        }
    }, [show, editingOrder]);

    if (!show) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4"
                style={{
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    {editingOrder ? 'تعديل الطلب' : 'إضافة طلب جديد'}
                </h2>

                <div className="space-y-4">
                    {/* Product Type */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">نوع المنتج <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="مثال: شنط بيور، أكياس بلاستيك..."
                            value={form.productType}
                            onChange={e => setForm({ ...form, productType: e.target.value })}
                            className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                        />
                    </div>

                    {/* Quantity + Color Count */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الكمية (كجم) <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="0"
                                placeholder="500"
                                value={form.quantity}
                                onChange={e => setForm({ ...form, quantity: e.target.value })}
                                className="w-full px-4 py-2.5 text-right direction-ltr border border-slate-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">عدد الألوان</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="3"
                                value={form.colorCount}
                                onChange={e => setForm({ ...form, colorCount: e.target.value })}
                                className="w-full px-4 py-2.5 text-right direction-ltr border border-slate-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Color + Size */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">اللون</label>
                            <input
                                type="text"
                                placeholder="أزرق، أبيض..."
                                value={form.color}
                                onChange={e => setForm({ ...form, color: e.target.value })}
                                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">المقاس</label>
                            <input
                                type="text"
                                placeholder="كبير، وسط، صغير..."
                                value={form.size}
                                onChange={e => setForm({ ...form, size: e.target.value })}
                                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">حالة الطلب</label>
                        <select
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                            className="w-full flex-1 appearance-none px-4 py-2.5 text-right border border-slate-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                        >
                            {ORDER_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات (اختياري)</label>
                        <textarea
                            rows={3}
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            placeholder="أي تفاصيل إضافية..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 bg-slate-100 font-bold hover:bg-slate-200 hover:text-white rounded-xl transition-all"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={() => onSave(form)}
                        className="btn-primary px-8 py-2.5 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                        {editingOrder ? 'حفظ التعديلات' : 'إضافة الطلب'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CustomerOrders = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState(null);
    const [orders, setOrders] = useState([]);
    const [expandedOrders, setExpandedOrders] = useState({});
    const [linkedSupplies, setLinkedSupplies] = useState([]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);

    // ─── Load ────────────────────────────────────────────────
    const loadData = React.useCallback(() => {
        // Customer
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        const found = customers.find(c => c.id?.toString() === id);
        setCustomer(found || null);

        // Orders for this customer
        const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        const customerOrders = allOrders
            .filter(o => o.customerId?.toString() === id)
            .sort((a, b) => b.id - a.id);
        setOrders(customerOrders);

        // All supplies (to find linked ones)
        const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
        setLinkedSupplies(allSupplies.filter(s => s.linkedCustomerId?.toString() === id));
    }, [id]);

    useEffect(() => {
        loadData();

        // Listen for real-time changes
        const unsubCustomers = subscribe(EVENTS.CUSTOMERS_CHANGED, loadData);
        const unsubInvoices = subscribe(EVENTS.INVOICES_CHANGED, loadData);
        const unsubSuppliers = subscribe(EVENTS.SUPPLIERS_CHANGED, loadData);

        return () => {
            if (unsubCustomers) unsubCustomers();
            if (unsubInvoices) unsubInvoices();
            if (unsubSuppliers) unsubSuppliers();
        };
    }, [id]);

    // ─── Helpers ────────────────────────────────────────────
    const getStatusInfo = (value) =>
        ORDER_STATUSES.find(s => s.value === value) || ORDER_STATUSES[0];

    const getOrderLinkedSupplies = (orderId) =>
        linkedSupplies.filter(s => s.linkedOrderId?.toString() === orderId?.toString());

    const toggleExpand = (orderId) =>
        setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));

    // ─── CRUD ────────────────────────────────────────────────
    const handleSaveOrder = (formToSave) => {
        if (!formToSave.productType || !formToSave.quantity) {
            toast.error('يرجى إدخال نوع المنتج والكمية');
            soundManager.play('error');
            return;
        }

        const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');

        if (editingOrder) {
            // Update
            const updated = allOrders.map(o =>
                o.id === editingOrder.id
                    ? { ...o, ...formToSave, quantity: parseFloat(formToSave.quantity), colorCount: parseFloat(formToSave.colorCount) || 0 }
                    : o
            );
            localStorage.setItem('customer_orders', JSON.stringify(updated));
            toast.success('تم تحديث الطلب بنجاح');
        } else {
            // Create
            const newOrder = {
                id: Date.now(),
                customerId: id,
                customerName: customer?.name || '',
                orderNumber: generateOrderNumber(),
                date: getCurrentDate().split('T')[0],
                ...formToSave,
                quantity: parseFloat(formToSave.quantity),
                colorCount: parseFloat(formToSave.colorCount) || 0,
            };
            allOrders.push(newOrder);
            localStorage.setItem('customer_orders', JSON.stringify(allOrders));
            toast.success(`تم إنشاء الطلب ${newOrder.orderNumber} بنجاح`);
        }

        soundManager.play('save');
        publish(EVENTS.CUSTOMERS_CHANGED, { type: 'order_change' });
        setShowAddModal(false);
        setEditingOrder(null);
        loadData();
    };

    const handleEditOrder = (order) => {
        setEditingOrder(order);
        setShowAddModal(true);
        soundManager.play('openWindow');
    };

    const handleDeleteOrder = (orderId) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
        const linked = getOrderLinkedSupplies(orderId);
        if (linked.length > 0) {
            if (!window.confirm(`هذا الطلب مرتبط بـ ${linked.length} توريدة. هل تريد الحذف مع إلغاء ربط التوريدات؟`)) return;
            // Unlink supplies
            const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
            const updated = allSupplies.map(s =>
                s.linkedOrderId?.toString() === orderId?.toString()
                    ? { ...s, linkedOrderId: null, linkedOrderNumber: null, linkedCustomerName: null, linkedCustomerId: null }
                    : s
            );
            localStorage.setItem('supplier_supplies', JSON.stringify(updated));
        }
        const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        localStorage.setItem('customer_orders', JSON.stringify(allOrders.filter(o => o.id !== orderId)));
        soundManager.play('delete');
        toast.success('تم حذف الطلب');
        loadData();
    };

    const handleChangeStatus = (order, newStatus) => {
        const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        const updated = allOrders.map(o => o.id === order.id ? { ...o, status: newStatus } : o);
        localStorage.setItem('customer_orders', JSON.stringify(updated));
        soundManager.play('save');
        loadData();
    };

    // ─── Stats ───────────────────────────────────────────────
    const totalOrders = orders.length;
    const openOrders = orders.filter(o => o.status === 'OPEN').length;
    const inProductionOrders = orders.filter(o => o.status === 'IN_PRODUCTION').length;
    const totalSuppliesLinked = linkedSupplies.length;

    if (!customer) {
        return (
            <div className="min-h-screen relative flex items-center justify-center">
                <div className="text-slate-600 text-xl">جاري التحميل... أو العميل غير موجود.</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F3F4F9] relative overflow-hidden pb-10">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative z-10 p-4 md:p-6 lg:p-8 space-y-5">

                {/* Navigation */}
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <button
                        onClick={() => navigate('/customers')}
                        className="flex items-center text-blue-300 hover:text-white transition-colors bg-white bg-opacity-10 px-3 py-2 rounded-lg text-sm"
                    >
                        <ArrowRight className="h-4 w-4 ml-1" />
                        العودة للعملاء
                    </button>
                </div>

                {/* Customer Hero */}
                <div className="glass-card p-5 md:p-7">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        {/* Left: Avatar + Name + Contact */}
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-[#5235E8] rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                                <User className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-white mb-2">{customer.name}</h1>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    {customer.phone && (
                                        <span className="flex items-center gap-1 bg-green-500 bg-opacity-20 text-green-300 px-3 py-1 rounded-full">
                                            <Phone className="h-3 w-3" /> {customer.phone}
                                        </span>
                                    )}
                                    {customer.notes && (
                                        <span className="flex items-center gap-1 bg-purple-500 bg-opacity-20 text-purple-300 px-3 py-1 rounded-full">
                                            <FileText className="h-3 w-3" /> {customer.notes}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Right: Add Order button */}
                        <button
                            onClick={() => { setEditingOrder(null); setShowAddModal(true); soundManager.play('openWindow'); }}
                            className="btn-primary flex items-center px-4 py-2 text-sm flex-shrink-0 text-white font-bold"
                        >
                            <Plus className="h-4 w-4 ml-2" />
                            إضافة طلب جديد
                        </button>
                    </div>

                    {/* Static Customer Info */}
                    {(customer.businessActivity || customer.usualProduct || customer.cliche || customer.clicheCode || customer.colorCount) && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {customer.businessActivity && (
                                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 flex items-start gap-3 transition-all hover:shadow-md">
                                    <div className="bg-yellow-100 p-2 rounded-lg">
                                        <Briefcase className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#006af8] mb-0.5 font-medium">النشاط التجاري</p>
                                        <p className="text-sm font-bold text-white">{customer.businessActivity}</p>
                                    </div>
                                </div>
                            )}
                            {customer.usualProduct && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3 transition-all hover:shadow-md">
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <Tag className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#006af8] mb-0.5 font-medium">نوع المنتج المعتاد</p>
                                        <p className="text-sm font-bold text-white">{customer.usualProduct}</p>
                                    </div>
                                </div>
                            )}
                            {customer.colorCount && (
                                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-start gap-3 transition-all hover:shadow-md">
                                    <div className="bg-orange-100 p-2 rounded-lg">
                                        <Palette className="h-4 w-4 text-orange-600 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#006af8] mb-0.5 font-medium">عدد الألوان</p>
                                        <p className="text-sm font-bold text-white">{customer.colorCount} لون</p>
                                    </div>
                                </div>
                            )}
                            {customer.cliche && (
                                <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 flex items-start gap-3 transition-all hover:shadow-md">
                                    <div className="bg-pink-100 p-2 rounded-lg">
                                        <Layers className="h-4 w-4 text-pink-600 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#006af8] mb-0.5 font-medium">الأكلشية</p>
                                        <p className="text-sm font-bold text-white">{customer.cliche}</p>
                                    </div>
                                </div>
                            )}
                            {customer.clicheCode && (
                                <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex items-start gap-3 transition-all hover:shadow-md">
                                    <div className="bg-teal-100 p-2 rounded-lg">
                                        <Hash className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#006af8] mb-0.5 font-medium">كود الأكلشية</p>
                                        <p className="text-sm font-mono font-bold text-white">{customer.clicheCode}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ml-0" style={{ animationDelay: '0.1s' }}>
                    {[
                        { label: 'إجمالي الطلبات', value: totalOrders, color: 'from-blue-500 to-indigo-500' },
                        { label: 'طلبات مفتوحة', value: openOrders, color: 'from-orange-500 to-amber-500' },
                        { label: 'في الإنتاج', value: inProductionOrders, color: 'from-yellow-500 to-yellow-600' },
                        { label: 'توريدات مرتبطة', value: totalSuppliesLinked, color: 'from-purple-500 to-violet-500' },
                    ].map((stat, i) => (
                        <div key={i} className="glass-card p-4 flex items-center gap-3">
                            <div className={`p-2 bg-gradient-to-r ${stat.color} rounded-xl`}>
                                <Package className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-[#006af8] mb-0.5">{stat.label}</p>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Orders List */}
                <div className="space-y-4" style={{ animationDelay: '0.2s' }}>
                    {orders.length === 0 ? (
                        <div className="glass-card p-10 text-center text-[#006af8]">
                            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>لا توجد طلبات لهذا العميل بعد. اضغط "إضافة طلب جديد" للبدء.</p>
                        </div>
                    ) : (
                        orders.map(order => {
                            const statusInfo = getStatusInfo(order.status);
                            const StatusIcon = statusInfo.icon;
                            const orderSupplies = getOrderLinkedSupplies(order.id);
                            const isExpanded = expandedOrders[order.id];
                            const totalSupplyValue = orderSupplies.reduce((sum, s) => safeMath.add(sum, s.totalPrice || 0), 0);

                            return (
                                <div key={order.id} className="glass-card overflow-hidden">
                                    {/* Order Header */}
                                    <div className="p-4 md:p-5">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                            {/* Left info */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="text-lg font-bold text-[#5235E8] bg-[#5235E8] bg-opacity-10 px-3 py-1 rounded-full">
                                                    {order.orderNumber}
                                                </span>
                                                <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${statusInfo.color}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusInfo.label}
                                                </span>
                                                <span className="text-xs text-[#006af8] bg-slate-100 px-2 py-1 rounded-full">
                                                    {order.date}
                                                </span>
                                            </div>

                                            {/* Right actions */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* Status change dropdown */}
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleChangeStatus(order, e.target.value)}
                                                    className="text-xs bg-white bg-opacity-10 border border-white border-opacity-20 text-slate-300 px-2 py-1 rounded-lg focus:outline-none"
                                                >
                                                    {ORDER_STATUSES.map(s => (
                                                        <option key={s.value} value={s.value}>{s.label}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleEditOrder(order)}
                                                    className="text-blue-400 hover:text-blue-300 p-1.5 hover:bg-blue-500 hover:bg-opacity-20 rounded-lg transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500 hover:bg-opacity-20 rounded-lg transition-colors"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleExpand(order.id)}
                                                    className="text-slate-400 hover:text-white p-1.5 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
                                                    title="عرض التفاصيل"
                                                >
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Order Details Summary */}
                                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div className="bg-white bg-opacity-5 rounded-lg p-2">
                                                <p className="text-xs text-[#006af8] mb-0.5">نوع المنتج</p>
                                                <p className="text-sm font-bold text-[#1e293b]">{order.productType || '-'}</p>
                                            </div>
                                            <div className="bg-white bg-opacity-5 rounded-lg p-2">
                                                <p className="text-xs text-[#006af8] mb-0.5">الكمية</p>
                                                <p className="text-sm font-bold text-[#ff8200]">{order.quantity?.toLocaleString()} كجم</p>
                                            </div>
                                            <div className="bg-white bg-opacity-5 rounded-lg p-2">
                                                <p className="text-xs text-[#006af8] mb-0.5">اللون / المقاس</p>
                                                <p className="text-sm font-bold text-[#1e293b]">{[order.color, order.size].filter(Boolean).join(' / ') || '-'}</p>
                                            </div>
                                            <div className="bg-white bg-opacity-5 rounded-lg p-2">
                                                <p className="text-xs text-[#006af8] mb-0.5">توريدات مرتبطة</p>
                                                <p className="text-sm font-bold text-[#5235E8]">{orderSupplies.length} توريدة</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded: Linked Supplies */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-200 px-4 md:px-5 py-4 bg-[#F3F4F9]">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                    <Link2 className="h-4 w-4 text-[#8410ff]" />
                                                    <span className="text-[#8410ff]">التوريدات المرتبطة بهذا الطلب</span>
                                                </h3>
                                                {orderSupplies.length > 0 && (
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                                                        إجمالي تكلفة الخامات: ${totalSupplyValue}
                                                    </span>
                                                )}
                                            </div>

                                            {orderSupplies.length === 0 ? (
                                                <div className="text-center text-[#006af8] text-sm py-6 bg-white rounded-xl border border-dashed border-slate-300">
                                                    <Link2 className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                                                    <p className="font-medium text-slate-600">لا توجد توريدات مرتبطة بعد.</p>
                                                    <p className="text-xs mt-1 text-slate-400">اذهب لصفحة المورد وارتبط بهذا الطلب عند إضافة توريدة.</p>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-[#F3F4F9] border-b border-slate-200">
                                                            <tr>
                                                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase">رقم التوريدة</th>
                                                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase">التاريخ</th>
                                                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase">المادة</th>
                                                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase">الكمية</th>
                                                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase">الإجمالي</th>
                                                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 uppercase">المورد</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {orderSupplies.map(supply => (
                                                                <tr key={supply.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-right">
                                                                    <td className="py-4 px-4 text-right">
                                                                        <span className="text-xs font-mono font-bold text-[#5235E8] bg-[#5235E8]/10 px-2 py-1 rounded">
                                                                            {supply.supplyNumber || `#${supply.id.toString().slice(-4)}`}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-4 text-[#006af8] font-medium text-right">{supply.date}</td>
                                                                    <td className="py-4 px-4 font-bold text-slate-800 text-right">{supply.productName}</td>
                                                                    <td className="py-4 px-4 text-orange-600 font-bold text-right">{supply.quantity} كجم</td>
                                                                    <td className="py-4 px-4 font-bold text-emerald-600 text-right">${supply.totalPrice}</td>
                                                                    <td className="py-4 px-4 font-bold text-blue-600 text-right">
                                                                        <div className="flex items-center justify-end gap-1.5">
                                                                            <Truck className="w-3.5 h-3.5" />
                                                                            {supabaseService.getSupplierName(supply.supplierId) || supply.supplierName || '-'}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {order.notes && (
                                                <div className="mt-3 text-xs text-slate-400 bg-white bg-opacity-5 rounded-lg p-2">
                                                    <span className="font-bold text-slate-300">ملاحظات: </span>{order.notes}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Add/Edit Order Modal */}
            <AddOrderModal
                show={showAddModal}
                editingOrder={editingOrder}
                onClose={() => {
                    setShowAddModal(false);
                    setEditingOrder(null);
                    soundManager.play('closeWindow');
                }}
                onSave={handleSaveOrder}
            />
        </div>
    );
};

export default CustomerOrders;
