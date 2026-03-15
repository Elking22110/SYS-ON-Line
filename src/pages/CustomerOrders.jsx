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
    AlertCircle,
    Loader,
    ChevronDown,
    ChevronUp,
    Calendar,
    AlertTriangle,
    Briefcase,
    Tag,
    Layers,
    Palette,
    Hash,
    Truck,
    FileText,
    Printer,
    Scissors,
    DollarSign,
    CreditCard,
    Wallet,
    Info
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';
import { getCurrentDate, addDays } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import supabaseService from '../utils/supabaseService';
import toast from 'react-hot-toast';

const ORDER_STATUSES = [
    { value: 'OPEN', label: 'مفتوح', color: 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/50', icon: Clock },
    { value: 'IN_PRODUCTION', label: 'في الإنتاج', color: 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-600/50', icon: Loader },
    { value: 'DONE', label: 'منتهي', color: 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700/50', icon: CheckCircle },
    { value: 'CLOSED', label: 'مغلق', color: 'bg-slate-600 text-white shadow-sm ring-1 ring-slate-700/50', icon: XCircle },
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
    pricePerKg: '',
    colorCount: '',
    clicheWidth: '',
    clicheHeight: '',
    printingCostPerKg: '',
    cuttingCostPerKg: '',
    notes: '',
    status: 'OPEN',
    clicheEnabled: false,
    profitMargin: '',
    deliveryDate: '',
    reminderDate: '',
};

const AddOrderModal = ({ show, editingOrder, onClose, onSave }) => {
    const [form, setForm] = useState(emptyFormTemplate);

    useEffect(() => {
        if (show) {
            if (editingOrder) {
                setForm({
                    ...editingOrder,
                    clicheEnabled: !!(editingOrder.clicheHeight || editingOrder.clicheWidth || editingOrder.colorCount),
                });
            } else {
                // Fetch default profit margin from settings
                const savedSettings = JSON.parse(localStorage.getItem('pos-settings') || '{}');
                const defaultMargin = savedSettings.orderProfitMargin !== undefined ? savedSettings.orderProfitMargin : '';
                
                const today = new Date().toISOString().split('T')[0];
                const delivery = addDays(today, 10).split('T')[0];
                const reminder = addDays(today, 6).split('T')[0];

                setForm({
                    ...emptyFormTemplate,
                    profitMargin: defaultMargin,
                    deliveryDate: delivery,
                    reminderDate: reminder
                });
            }
        }
    }, [show, editingOrder]);

    if (!show) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm"
        >
            <div
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4"
                style={{
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
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
                            className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                        />
                    </div>

                    {/* Quantity + Price */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الكمية (كجم) <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="500"
                                value={form.quantity}
                                onChange={e => setForm({ ...form, quantity: e.target.value })}
                                className="w-full px-4 py-2.5 text-right direction-ltr border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">سعر الكيلو <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="150"
                                value={form.pricePerKg}
                                onChange={e => setForm({ ...form, pricePerKg: e.target.value })}
                                className="w-full px-4 py-2.5 text-right direction-ltr border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Cliche Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-purple-600" />
                            <span className="text-sm font-bold text-slate-700">تفعيل تكلفة الأكلشية؟</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, clicheEnabled: !form.clicheEnabled })}
                            className={`w-12 h-6 rounded-full transition-all relative ${form.clicheEnabled ? 'bg-purple-600' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.clicheEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Cliche Dimensions (Conditional) */}
                    {form.clicheEnabled && (
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">طول الأكلشية <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        placeholder="طول"
                                        value={form.clicheHeight}
                                        onChange={e => setForm({ ...form, clicheHeight: e.target.value })}
                                        className="w-full px-4 py-2.5 text-right direction-ltr border border-purple-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">عرض الأكلشية <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        placeholder="عرض"
                                        value={form.clicheWidth}
                                        onChange={e => setForm({ ...form, clicheWidth: e.target.value })}
                                        className="w-full px-4 py-2.5 text-right direction-ltr border border-purple-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">عدد الألوان <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="عدد الألوان"
                                    value={form.colorCount}
                                    onChange={e => setForm({ ...form, colorCount: e.target.value })}
                                    className="w-full px-4 py-2.5 text-right direction-ltr border border-purple-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                                />
                            </div>
                            <div className="text-xs text-purple-600 font-bold bg-white p-2 rounded-lg border border-purple-100 flex justify-between">
                                <span>تكلفة الأكلشية التقريبية:</span>
                                <span>
                                    {((parseFloat(form.clicheHeight) || 0) * (parseFloat(form.clicheWidth) || 0) * (parseFloat(form.colorCount) || 0) * 0.85).toLocaleString()} ج.م
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Printing & Cutting Costs */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">تكلفة المطبعه / كجم <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="0.00"
                                value={form.printingCostPerKg}
                                onChange={e => setForm({ ...form, printingCostPerKg: e.target.value })}
                                className="w-full px-4 py-2.5 text-right direction-ltr border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">تكلفة المقص / كجم <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="0.00"
                                value={form.cuttingCostPerKg}
                                onChange={e => setForm({ ...form, cuttingCostPerKg: e.target.value })}
                                className="w-full px-4 py-2.5 text-right direction-ltr border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                    </div>



                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">اللون</label>
                            <input
                                type="text"
                                placeholder="أزرق..."
                                value={form.color}
                                onChange={e => setForm({ ...form, color: e.target.value })}
                                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">المقاس</label>
                            <input
                                type="text"
                                placeholder="وسط..."
                                value={form.size}
                                onChange={e => setForm({ ...form, size: e.target.value })}
                                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">حالة الطلب</label>
                        <select
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                            className="w-full flex-1 appearance-none px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
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
                            className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            placeholder="أي تفاصيل إضافية..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">تاريخ التسليم <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                value={form.deliveryDate}
                                onChange={e => setForm({ ...form, deliveryDate: e.target.value })}
                                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">تاريخ التنبيه <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                value={form.reminderDate}
                                onChange={e => setForm({ ...form, reminderDate: e.target.value })}
                                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
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

    // Cliche Management
    const [showClicheModal, setShowClicheModal] = useState(false);
    const [clicheForm, setClicheForm] = useState({ name: '', length: '', width: '' });

    // Payment Management
    const [payments, setPayments] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // ─── Load ────────────────────────────────────────────────
    const loadData = React.useCallback(async () => {
        // Customer from local storage (already merged with Supabase in Customers.jsx)
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        const found = customers.find(c => c.id?.toString() === id);
        setCustomer(found || null);

        // Orders - try Supabase first, fallback to localStorage
        try {
            const cloudOrders = await supabaseService.getCustomerOrders(id);
            if (cloudOrders && cloudOrders.length > 0) {
                // Merge cloud with local (cloud wins for status fields)
                const localOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
                const merged = cloudOrders.map(co => {
                    const lo = localOrders.find(o => o.id?.toString() === co.id?.toString());
                    return lo ? { ...lo, ...co } : co;
                });
                // Also include local-only orders (not yet synced)
                const localOnly = localOrders.filter(lo =>
                    lo.customerId?.toString() === id &&
                    !cloudOrders.find(co => co.id?.toString() === lo.id?.toString())
                );
                const allMerged = [...merged, ...localOnly].sort((a, b) => b.id - a.id);
                setOrders(allMerged);
                localStorage.setItem('customer_orders', JSON.stringify([
                    ...JSON.parse(localStorage.getItem('customer_orders') || '[]').filter(o => o.customerId?.toString() !== id),
                    ...allMerged
                ]));
            } else {
                const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
                setOrders(allOrders.filter(o => o.customerId?.toString() === id).sort((a, b) => b.id - a.id));
            }
        } catch (e) {
            const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
            setOrders(allOrders.filter(o => o.customerId?.toString() === id).sort((a, b) => b.id - a.id));
        }

        // Payments - try Supabase first
        try {
            const cloudPayments = await supabaseService.getCustomerPayments(id);
            if (cloudPayments && cloudPayments.length > 0) {
                setPayments(cloudPayments);
                const allPayments = JSON.parse(localStorage.getItem('customer_payments') || '[]');
                const otherPayments = allPayments.filter(p => p.customerId?.toString() !== id);
                localStorage.setItem('customer_payments', JSON.stringify([...otherPayments, ...cloudPayments]));
            } else {
                const allPayments = JSON.parse(localStorage.getItem('customer_payments') || '[]');
                setPayments(allPayments.filter(p => p.customerId?.toString() === id));
            }
        } catch (e) {
            const allPayments = JSON.parse(localStorage.getItem('customer_payments') || '[]');
            setPayments(allPayments.filter(p => p.customerId?.toString() === id));
        }

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
        const unsubOrders = subscribe(EVENTS.CUSTOMER_ORDERS_CHANGED, loadData);
        const unsubPayments = subscribe(EVENTS.CUSTOMER_PAYMENTS_CHANGED, loadData);

        return () => {
            if (unsubCustomers) unsubCustomers();
            if (unsubInvoices) unsubInvoices();
            if (unsubSuppliers) unsubSuppliers();
            if (unsubOrders) unsubOrders();
            if (unsubPayments) unsubPayments();
        };
    }, [id]);

    // ─── Helpers ────────────────────────────────────────────
    const getStatusInfo = (value) =>
        ORDER_STATUSES.find(s => s.value === value) || ORDER_STATUSES[0];

    const getOrderLinkedSupplies = (orderId) =>
        linkedSupplies.filter(s => s.linkedOrderId?.toString() === orderId?.toString());

    // ─── Printing Orders ─────────────────────────────────────
    const handlePrintOrder = (order) => {
        soundManager.play('openWindow');
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
            return;
        }

        const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
        const storeName = storeInfo.storeName || 'إلكينج';
        const storePhone = storeInfo.phone || '';
        const storeAddress = storeInfo.address || '';
        const storeLogo = storeInfo.logo || '';

        const qty = parseFloat(order.quantity) || 0;
        const price = parseFloat(order.pricePerKg) || 0;
        const printing = parseFloat(order.printingCostPerKg) || 0;
        const cutting = parseFloat(order.cuttingCostPerKg) || 0;
        const cliche = parseFloat(order.clicheCost) || 0;
        const subtotal = (qty * price) + (qty * printing) + (qty * cutting) + cliche;
        const margin = parseFloat(order.profitMargin) || 0;
        const grandTotal = subtotal + (subtotal * (margin / 100));
        
        let logoHtml = '';
        if (storeLogo) {
            logoHtml = `<div style="text-align: center; margin-bottom: 20px;">
                <img src="${storeLogo}" style="max-height: 80px; max-width: 100%; object-fit: contain;" onload="window.print()" onerror="window.print()" />
            </div>`;
        } else {
            // If no logo, we print immediately
            setTimeout(() => { if(printWindow.print) printWindow.print(); }, 500);
        }

        const html = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة طلب تشغيل - ${order.orderNumber}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
                    .header h1 { margin: 0; color: #5235E8; font-size: 24px; }
                    .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
                    .section { margin-bottom: 20px; }
                    .section-title { font-weight: bold; background: #f8f9fa; padding: 5px 10px; border-right: 4px solid #5235E8; margin-bottom: 10px; }
                    .row { display: flex; justify-content: space-between; border-bottom: 1px dashed #eee; padding: 5px 0; }
                    .row:last-child { border-bottom: none; }
                    .label { color: #666; font-size: 14px; }
                    .value { font-weight: bold; font-size: 14px; }
                    .totals { margin-top: 30px; border-top: 2px solid #5235E8; padding-top: 15px; }
                    .totals .row { padding: 8px 0; }
                    .totals .grand-total { font-size: 18px; color: #5235E8; font-weight: 900; }
                    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                ${logoHtml}
                <div class="header">
                    <h1>${storeName}</h1>
                    <p>${storePhone ? 'ت: ' + storePhone : ''} ${storeAddress ? ' | ' + storeAddress : ''}</p>
                    <p style="margin-top: 10px; font-weight: bold; font-size: 18px;">فاتورة طلب تشغيل</p>
                    <p>رقم الطلب: ${order.orderNumber}</p>
                </div>

                <div class="section">
                    <div class="section-title">بيانات العميل</div>
                    <div class="row"><span class="label">اسم العميل:</span><span class="value">${customer.name}</span></div>
                    <div class="row"><span class="label">رقم الهاتف:</span><span class="value">${customer.phone || '-'}</span></div>
                    <div class="row"><span class="label">تاريخ الطلب:</span><span class="value">${order.date}</span></div>
                    <div class="row"><span class="label">تاريخ الاستلام:</span><span class="value">${order.deliveryDate || '-'}</span></div>
                </div>

                <div class="section">
                    <div class="section-title">تفاصيل التصنيع</div>
                    <div class="row"><span class="label">نوع المنتج:</span><span class="value">${order.productType || '-'}</span></div>
                    <div class="row"><span class="label">اللون / المقاس:</span><span class="value">${order.color || '-'} / ${order.size || '-'}</span></div>
                    <div class="row"><span class="label">الكمية المطلوبة:</span><span class="value">${qty} كجم</span></div>
                    ${order.clicheEnabled ? `
                        <div class="row"><span class="label">مقاس الأكلشية:</span><span class="value">${order.clicheWidth} × ${order.clicheHeight}</span></div>
                        <div class="row"><span class="label">عدد الألوان:</span><span class="value">${order.colorCount} لون</span></div>
                    ` : ''}
                </div>

                <div class="section">
                    <div class="section-title">التكاليف المبدئية للإنتاج</div>
                    <div class="row"><span class="label">سعر كيلو الشراء (خام):</span><span class="value">${price.toLocaleString()} ج.م</span></div>
                    <div class="row"><span class="label">إجمالي التكلفة بالمادة الخام:</span><span class="value">${(qty * price).toLocaleString()} ج.م</span></div>
                    
                    ${printing > 0 ? `<div class="row"><span class="label">تكلفة الطباعة:</span><span class="value">${(qty * printing).toLocaleString()} ج.م</span></div>` : ''}
                    ${cutting > 0 ? `<div class="row"><span class="label">تكلفة المقص:</span><span class="value">${(qty * cutting).toLocaleString()} ج.م</span></div>` : ''}
                    ${cliche > 0 ? `<div class="row"><span class="label">تكلفة الأكلشية:</span><span class="value">${cliche.toLocaleString()} ج.م</span></div>` : ''}
                </div>

                <div class="totals">
                    <div class="row grand-total"><span class="label">إجمالي قيمة الفاتورة:</span><span class="value">${grandTotal.toLocaleString()} ج.م</span></div>
                </div>

                <div class="footer">
                    تم إصدار هذه الفاتورة من النظام <br>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    // ─── CRUD ────────────────────────────────────────────────
    const handleSaveOrder = (formToSave) => {
        // Validation for required fields
        const requiredFields = [
            { key: 'productType', label: 'نوع المنتج' },
            { key: 'quantity', label: 'الكمية' },
            { key: 'pricePerKg', label: 'سعر الكيلو' },
            { key: 'printingCostPerKg', label: 'تكلفة المطبعه' },
            { key: 'cuttingCostPerKg', label: 'تكلفة المقص' }
        ];

        if (formToSave.clicheEnabled) {
            requiredFields.push(
                { key: 'clicheHeight', label: 'طول الأكلشية' },
                { key: 'clicheWidth', label: 'عرض الأكلشية' },
                { key: 'colorCount', label: 'عدد الألوان' }
            );
        }

        const missing = requiredFields.filter(f => !formToSave[f.key] && formToSave[f.key] !== 0);
        
        if (missing.length > 0) {
            const labels = missing.map(f => f.label).join('، ');
            toast.error(`يرجى إدخال الحقول المطلوبة: ${labels}`);
            soundManager.play('error');
            return;
        }

        const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');

        if (editingOrder) {
            // Update in localStorage
            const updated = allOrders.map(o =>
                o.id === editingOrder.id
                    ? {
                        ...o,
                        ...formToSave,
                        quantity: parseFloat(formToSave.quantity),
                        pricePerKg: parseFloat(formToSave.pricePerKg) || 0,
                        colorCount: parseFloat(formToSave.colorCount) || 0,
                        clicheWidth: parseFloat(formToSave.clicheWidth) || 0,
                        clicheHeight: parseFloat(formToSave.clicheHeight) || 0,
                        printingCostPerKg: parseFloat(formToSave.printingCostPerKg) || 0,
                        cuttingCostPerKg: parseFloat(formToSave.cuttingCostPerKg) || 0,
                        clicheEnabled: formToSave.clicheEnabled || false,
                        clicheCost: formToSave.clicheEnabled ? ((parseFloat(formToSave.clicheHeight) || 0) * (parseFloat(formToSave.clicheWidth) || 0) * (parseFloat(formToSave.colorCount) || 0) * 0.85) : 0,
                        profitMargin: parseFloat(formToSave.profitMargin) || 0
                    }
                    : o
            );
            localStorage.setItem('customer_orders', JSON.stringify(updated));
            // Sync to Supabase
            supabaseService.updateCustomerOrder(editingOrder.id, {
                ...formToSave,
                profitMargin: parseFloat(formToSave.profitMargin) || 0,
                clicheCost: formToSave.clicheEnabled ? ((parseFloat(formToSave.clicheHeight) || 0) * (parseFloat(formToSave.clicheWidth) || 0) * (parseFloat(formToSave.colorCount) || 0) * 0.85) : 0
            }).catch(console.error);
            toast.success('تم تحديث الطلب بنجاح');
        } else {
            // Create
            const clicheCost = formToSave.clicheEnabled ? ((parseFloat(formToSave.clicheHeight) || 0) * (parseFloat(formToSave.clicheWidth) || 0) * (parseFloat(formToSave.colorCount) || 0) * 0.85) : 0;
            const newOrder = {
                id: Date.now(),
                customerId: id,
                customerName: customer?.name || '',
                orderNumber: generateOrderNumber(),
                date: getCurrentDate().split('T')[0],
                ...formToSave,
                quantity: parseFloat(formToSave.quantity),
                pricePerKg: parseFloat(formToSave.pricePerKg) || 0,
                colorCount: parseFloat(formToSave.colorCount) || 0,
                clicheWidth: parseFloat(formToSave.clicheWidth) || 0,
                clicheHeight: parseFloat(formToSave.clicheHeight) || 0,
                printingCostPerKg: parseFloat(formToSave.printingCostPerKg) || 0,
                cuttingCostPerKg: parseFloat(formToSave.cuttingCostPerKg) || 0,
                clicheEnabled: formToSave.clicheEnabled || false,
                clicheCost: clicheCost,
                profitMargin: parseFloat(formToSave.profitMargin) || 0,
            };
            allOrders.push(newOrder);
            localStorage.setItem('customer_orders', JSON.stringify(allOrders));
            // Sync to Supabase
            supabaseService.addCustomerOrder(newOrder).catch(console.error);
            toast.success(`تم إنشاء الطلب ${newOrder.orderNumber} بنجاح`);

            // عرض تنبيه لطباعة الفاتورة بعد إنشاء الطلب مباشرة
            setTimeout(() => {
                if (window.confirm('تم حفظ الأوردر بنجاح! هل تود معاينة/طباعة فاتورة تفاصيل الطلب الآن؟')) {
                    handlePrintOrder(newOrder);
                }
            }, 600);
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
        // Sync deletion to Supabase
        supabaseService.deleteCustomerOrder(orderId).catch(console.error);
        soundManager.play('delete');
        toast.success('تم حذف الطلب');
        loadData();
    };

    const handleSavePayment = (paymentData) => {
        const amount = parseFloat(paymentData.amount);
        if (!amount || amount <= 0) {
            toast.error('يرجى إدخال مبلغ صحيح');
            return;
        }

        if (remainingBalance <= 0) {
            toast.error('لا توجد مديونية على هذا العميل لسدادها.');
            return;
        }

        if (amount > remainingBalance) {
            toast.error(`المبلغ المدخل (${amount.toLocaleString()}) أكبر من المديونية المتبقية (${remainingBalance.toLocaleString()}).`);
            return;
        }

        const allPayments = JSON.parse(localStorage.getItem('customer_payments') || '[]');
        const newPayment = {
            id: Date.now(),
            customerId: id,
            customerName: customer?.name || '',
            date: getCurrentDate().split('T')[0],
            amount: amount,
            note: paymentData.notes || ''
        };

        allPayments.push(newPayment);
        localStorage.setItem('customer_payments', JSON.stringify(allPayments));
        // Sync to Supabase
        supabaseService.addCustomerPayment(newPayment).catch(console.error);

        toast.success('تم تسجيل الدفعة بنجاح');
        soundManager.play('save');
        setShowPaymentModal(false);
        loadData();
    };

    const handleChangeStatus = (order, newStatus) => {
        const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        const updatedOrd = { ...order, status: newStatus };
        const updated = allOrders.map(o => o.id === order.id ? updatedOrd : o);
        localStorage.setItem('customer_orders', JSON.stringify(updated));
        // Sync to Supabase
        supabaseService.updateCustomerOrder(order.id, updatedOrd).catch(console.error);
        soundManager.play('save');
        loadData();

        // عرض تنبيه طباعة الفاتورة عند الانتهاء من الطلب (مغلق)
        if (newStatus === 'CLOSED') {
            setTimeout(() => {
                if(window.confirm('ممتاز! تم إغلاق الأوردر، هل ترغب في طباعة فاتورة الحساب النهائية الآن للعميل؟')) {
                    handlePrintOrder(updatedOrd);
                }
            }, 600);
        }
    };

    const handleAddCustomerCliche = () => {
        if (!clicheForm.name || !clicheForm.length || !clicheForm.width) {
            toast.error('يرجى إدخال اسم ومقاس الأكلشية');
            return;
        }

        const dimensions = `${clicheForm.length} × ${clicheForm.width}`;
        const clicheToSave = { name: clicheForm.name, dimensions };

        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        let updatedCustomer = null;
        const updatedCustomers = customers.map(c => {
            if (c.id?.toString() === id) {
                const currentCliches = Array.isArray(c.profileCliches) ? c.profileCliches : [];
                updatedCustomer = {
                    ...c,
                    profileCliches: [...currentCliches, { id: Date.now(), ...clicheToSave }]
                };
                return updatedCustomer;
            }
            return c;
        });

        if (updatedCustomer) {
            localStorage.setItem('customers', JSON.stringify(updatedCustomers));
            supabaseService.updateCustomer(updatedCustomer.id, updatedCustomer).catch(console.error);
            toast.success('تم إضافة الأكلشية للملف الشخصي');
            soundManager.play('save');
            setClicheForm({ name: '', length: '', width: '' });
            setShowClicheModal(false);
            loadData();
            publish(EVENTS.CUSTOMERS_CHANGED);
        }
    };

    const handleDeleteCustomerCliche = (clicheId) => {
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        let updatedCustomer = null;
        const updatedCustomers = customers.map(c => {
            if (c.id?.toString() === id) {
                const currentCliches = Array.isArray(c.profileCliches) ? c.profileCliches : [];
                updatedCustomer = {
                    ...c,
                    profileCliches: currentCliches.filter(item => item.id !== clicheId)
                };
                return updatedCustomer;
            }
            return c;
        });

        if (updatedCustomer) {
            localStorage.setItem('customers', JSON.stringify(updatedCustomers));
            supabaseService.updateCustomer(updatedCustomer.id, updatedCustomer).catch(console.error);
            toast.success('تم حذف الأكلشية');
            soundManager.play('delete');
            loadData();
            publish(EVENTS.CUSTOMERS_CHANGED);
        }
    };

    // ─── Stats ───────────────────────────────────────────────
    const totalOrders = orders.length;
    const openOrders = orders.filter(o => o.status === 'OPEN').length;
    const inProductionOrders = orders.filter(o => o.status === 'IN_PRODUCTION').length;
    const totalSuppliesLinked = linkedSupplies.length;

    // Financial Stats
    const totalQuantityOrdered = orders.reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0);
    const totalOrdersAmount = orders.reduce((sum, o) => {
        const qty = parseFloat(o.quantity) || 0;
        const productTotal = qty * (parseFloat(o.pricePerKg) || 0);
        const printingTotal = qty * (parseFloat(o.printingCostPerKg) || 0);
        const cuttingTotal = qty * (parseFloat(o.cuttingCostPerKg) || 0);
        const clicheTotal = parseFloat(o.clicheCost) || 0;
        
        const subtotal = productTotal + printingTotal + cuttingTotal + clicheTotal;
        const profit = subtotal * ((parseFloat(o.profitMargin) || 0) / 100);
        
        return sum + subtotal + profit;
    }, 0);
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const remainingBalance = totalOrdersAmount - totalPaid;

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
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-2">{customer.name}</h1>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    {customer.phone && (
                                        <span className="flex items-center gap-1.5 bg-green-100 border border-green-200 text-green-700 px-4 py-1.5 rounded-full font-bold shadow-sm">
                                            <Phone className="h-3.5 w-3.5" /> {customer.phone}
                                        </span>
                                    )}
                                    {customer.notes && (
                                        <span className="flex items-center gap-1.5 bg-indigo-100 border border-indigo-200 text-indigo-700 px-4 py-1.5 rounded-full font-bold shadow-sm">
                                            <FileText className="h-3.5 w-3.5" /> {customer.notes}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Right: Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowPaymentModal(true); soundManager.play('openWindow'); }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center px-4 py-2 text-sm flex-shrink-0 font-bold rounded-xl shadow-lg transition-all"
                            >
                                <CreditCard className="h-4 w-4 ml-2" />
                                سداد دفعة
                            </button>
                            <button
                                onClick={() => { setEditingOrder(null); setShowAddModal(true); soundManager.play('openWindow'); }}
                                className="btn-primary flex items-center px-4 py-2 text-sm flex-shrink-0 text-white font-bold"
                            >
                                <Plus className="h-4 w-4 ml-2" />
                                إضافة طلب جديد
                            </button>
                        </div>
                    </div>

                    {/* Static Customer Info */}
                    {/* Unified Financial Summary Area - Prominent at the top */}
                    <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3 transition-all hover:bg-blue-500/20">
                            <div className="bg-blue-500/20 p-2 rounded-lg">
                                <Hash className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            </div>
                            <div>
                                <p className="text-[10px] text-blue-600 uppercase tracking-wider mb-0.5 font-bold">إجمالي الطلبات</p>
                                <p className="text-lg font-black text-slate-800">{totalOrders} <small className="text-[10px] font-normal text-slate-500">طلب</small></p>
                            </div>
                        </div>

                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start gap-3 transition-all hover:bg-orange-500/20">
                            <div className="bg-orange-500/20 p-2 rounded-lg">
                                <Package className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            </div>
                            <div>
                                <p className="text-[10px] text-orange-600 uppercase tracking-wider mb-0.5 font-bold">إجمالي الكمية</p>
                                <p className="text-lg font-black text-slate-800">{totalQuantityOrdered.toLocaleString()} <small className="text-[10px] font-normal text-slate-500">كجم</small></p>
                            </div>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3 transition-all hover:bg-emerald-500/20">
                            <div className="bg-emerald-500/20 p-2 rounded-lg">
                                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            </div>
                            <div>
                                <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-0.5 font-bold">إجمالي المسدد</p>
                                <p className="text-lg font-black text-emerald-700">{totalPaid.toLocaleString()} <small className="text-[10px] font-normal text-slate-500">ج.م</small></p>
                            </div>
                        </div>

                        <div className={`border rounded-xl p-3 flex items-start gap-3 transition-all hover:scale-[1.02] ${remainingBalance > 0 ? 'bg-red-500/10 border-red-500/30 shadow-red-100 shadow-sm' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                            <div className={`${remainingBalance > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'} p-2 rounded-lg`}>
                                <AlertTriangle className={`h-4 w-4 ${remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 font-bold">المديونية المتبقية</p>
                                <p className={`text-lg font-black ${remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {remainingBalance <= 0 ? 0 : remainingBalance.toLocaleString()} <small className="text-[10px] font-normal opacity-60">ج.م</small>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Expanded Profile Details - Matching the Stat Cards style */}
                    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-amber-100 border border-amber-200 rounded-xl p-3 flex items-start gap-3 transition-all hover:bg-amber-200/50 shadow-sm">
                            <div className="bg-amber-500/20 p-2 rounded-lg">
                                <Briefcase className="h-4 w-4 text-amber-700 flex-shrink-0" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-amber-700 uppercase tracking-wider mb-0.5 font-bold">النشاط التجاري</p>
                                <p className="text-sm font-black text-slate-900 truncate">{customer.businessActivity || 'غير محدد'}</p>
                            </div>
                        </div>

                        <div className="bg-indigo-100 border border-indigo-200 rounded-xl p-3 flex items-start gap-3 transition-all hover:bg-indigo-200/50 shadow-sm">
                            <div className="bg-indigo-500/20 p-2 rounded-lg">
                                <Tag className="h-4 w-4 text-indigo-700 flex-shrink-0" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-indigo-700 uppercase tracking-wider mb-0.5 font-bold">المنتج المعتاد</p>
                                <p className="text-sm font-black text-slate-900 truncate">{customer.usualProduct || 'غير محدد'}</p>
                            </div>
                        </div>

                        <div className="bg-pink-100 border border-pink-200 rounded-xl p-3 flex items-start gap-3 transition-all hover:bg-pink-200/50 shadow-sm">
                            <div className="bg-pink-500/20 p-2 rounded-lg">
                                <Palette className="h-4 w-4 text-pink-700 flex-shrink-0" />
                            </div>
                            <div>
                                <p className="text-[10px] text-pink-700 uppercase tracking-wider mb-0.5 font-bold">الألوان</p>
                                <p className="text-sm font-black text-slate-900">{customer.colorCount ? `${customer.colorCount} لون` : 'غير محدد'}</p>
                            </div>
                        </div>

                        <div className="bg-cyan-100 border border-cyan-200 rounded-xl p-3 flex items-start gap-3 transition-all hover:bg-cyan-200/50 shadow-sm">
                            <div className="bg-cyan-500/20 p-2 rounded-lg">
                                <Layers className="h-4 w-4 text-cyan-700 flex-shrink-0" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-cyan-700 uppercase tracking-wider mb-0.5 font-bold">الأكلشية</p>
                                <p className="text-sm font-black text-slate-900 truncate">
                                    {customer.clicheWidth && customer.clicheHeight 
                                        ? `${customer.clicheWidth} × ${customer.clicheHeight}` 
                                        : customer.cliche || 'غير محدد'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Profile Cliches (Additional) */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Array.isArray(customer.profileCliches) && customer.profileCliches.map(pc => (
                            <div key={pc.id} className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-start justify-between gap-3 transition-all hover:shadow-md group">
                                <div className="flex items-start gap-3">
                                    <div className="bg-purple-100 p-2 rounded-lg">
                                        <Layers className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#006af8] mb-0.5 font-medium">{pc.name}</p>
                                        <p className="text-sm font-bold text-slate-700">{pc.dimensions}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteCustomerCliche(pc.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                        {/* Add More Cliche Button Card */}
                        <div
                            onClick={() => setShowClicheModal(true)}
                            className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-all group min-h-[60px]"
                        >
                            <Plus className="h-4 w-4 text-slate-400 group-hover:text-[#5235E8]" />
                            <span className="text-sm font-bold text-slate-500 group-hover:text-[#5235E8]">أضف أكلشية جديد</span>
                        </div>
                    </div>
                </div>

                {/* --- CUSTOMER CLICHE MODAL --- */}
                {showClicheModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Layers className="h-5 w-5 text-purple-600" />
                                إضافة أكلشية لملف العميل
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">اسم الأكلشية</label>
                                    <input
                                        type="text"
                                        placeholder="مثال: أكلشية 4 لون وجه واحد"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        value={clicheForm.name}
                                        onChange={e => setClicheForm({ ...clicheForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">الطول</label>
                                        <input
                                            type="number"
                                            placeholder="طول"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                                            value={clicheForm.length}
                                            onChange={e => setClicheForm({ ...clicheForm, length: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">العرض</label>
                                        <input
                                            type="number"
                                            placeholder="عرض"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                                            value={clicheForm.width}
                                            onChange={e => setClicheForm({ ...clicheForm, width: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={handleAddCustomerCliche}
                                    className="flex-1 bg-[#5235E8] text-white py-2 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all"
                                >
                                    حفظ الأكلشية
                                </button>
                                <button
                                    onClick={() => setShowClicheModal(false)}
                                    className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Orders List Section */}
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
                                        <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-3">
                                            {/* Right actions (Now on the right/start of the row) */}
                                            <div className="flex items-center gap-2 flex-nowrap">
                                                <button
                                                    onClick={() => handlePrintOrder(order)}
                                                    className="text-white bg-indigo-600 hover:bg-indigo-700 p-1.5 rounded-lg transition-colors shadow-sm min-w-[32px] min-h-[32px] flex items-center justify-center"
                                                    title="معاينة وطباعة الفاتورة"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditOrder(order)}
                                                    className="text-white bg-blue-600 hover:bg-blue-700 p-1.5 rounded-lg transition-colors shadow-sm min-w-[32px] min-h-[32px] flex items-center justify-center"
                                                    title="تعديل"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="text-white bg-red-600 hover:bg-red-700 p-1.5 rounded-lg transition-colors shadow-sm min-w-[32px] min-h-[32px] flex items-center justify-center"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleExpand(order.id)}
                                                    className="text-white bg-slate-700 hover:bg-slate-800 p-1.5 rounded-lg transition-colors shadow-sm min-w-[32px] min-h-[32px] flex items-center justify-center"
                                                    title="عرض التفاصيل"
                                                >
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </button>
                                                {/* Status change dropdown */}
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleChangeStatus(order, e.target.value)}
                                                    className={`text-[11px] font-black h-8 px-2 rounded-lg border-none focus:outline-none cursor-pointer transition-all shadow-md appearance-none text-center min-w-[90px] ${statusInfo.color}`}
                                                >
                                                    {ORDER_STATUSES.map(s => (
                                                        <option key={s.value} value={s.value} className="text-slate-900 bg-white font-bold">
                                                            {s.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Left info (Now on the left/end of the row) */}
                                            <div className="flex items-center gap-3 flex-wrap order-first md:order-none">
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
                                                {order.deliveryDate && (
                                                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        تسليم: {order.deliveryDate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Order Details Summary */}
                                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div className="bg-slate-100/50 border border-slate-200 rounded-lg p-2.5 shadow-sm">
                                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-0.5">نوع المنتج</p>
                                                <p className="text-sm font-black text-slate-800">{order.productType || '-'}</p>
                                            </div>
                                            <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 shadow-sm">
                                                <p className="text-[10px] font-black text-orange-700 uppercase tracking-wider mb-0.5">الكمية</p>
                                                <p className="text-sm font-black text-orange-600">{order.quantity?.toLocaleString()} <small className="text-[10px]">كجم</small></p>
                                            </div>
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 shadow-sm">
                                                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-0.5">اللون / المقاس</p>
                                                <p className="text-sm font-black text-slate-800">
                                                    {order.color || order.size ? `${order.color || '-'} / ${order.size || '-'}` : '-'}
                                                </p>
                                            </div>
                                            <div className={`rounded-lg p-2.5 shadow-sm border ${orderSupplies.length > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">توفير الخامات</p>
                                                <p className={`text-sm font-black ${orderSupplies.length > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {orderSupplies.length > 0 ? 'تم توفير الخامات' : 'لم يتم توفير خامات'}
                                                </p>
                                            </div>
                                            {order.reminderDate && (
                                                <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-100">
                                                    <p className="text-xs text-yellow-700 mb-0.5 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" /> تنبيه الموعد
                                                    </p>
                                                    <p className="text-sm font-bold text-yellow-800">{order.reminderDate}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Cost Calculation Breakdown */}
                                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                            <h4 className="text-xs font-bold text-[#006af8] border-b border-slate-200 pb-2 mb-2">تفصيل الحساب الربحي والإنتاج:</h4>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Production Costs */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-500 font-medium flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> تكلفة الخامة ({order.quantity} كجم):</span>
                                                        <span className="font-bold text-slate-800">${(order.quantity * (order.pricePerKg || 0)).toLocaleString()}</span>
                                                    </div>
                                                    
                                                    {order.printingCostPerKg > 0 && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-500 font-medium flex items-center gap-1.5"><Printer className="h-3.5 w-3.5" /> تكلفة المطبعه:</span>
                                                            <span className="font-bold text-slate-800">${(order.quantity * order.printingCostPerKg).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {order.cuttingCostPerKg > 0 && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-500 font-medium flex items-center gap-1.5"><Scissors className="h-3.5 w-3.5" /> تكلفة المقص:</span>
                                                            <span className="font-bold text-slate-800">${(order.quantity * order.cuttingCostPerKg).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {order.clicheEnabled && order.clicheCost > 0 && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-500 font-medium flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> تكلفة الأكلشية:</span>
                                                            <span className="font-bold text-slate-800">${(order.clicheCost || 0).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Totals and Profit */}
                                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                                    {(() => {
                                                        const raw = order.quantity * (order.pricePerKg || 0);
                                                        const pr = order.quantity * (order.printingCostPerKg || 0);
                                                        const cu = order.quantity * (order.cuttingCostPerKg || 0);
                                                        const cl = parseFloat(order.clicheCost) || 0;
                                                        const sub = raw + pr + cu + cl;
                                                        const margin = parseFloat(order.profitMargin) || 0;
                                                        const profit = sub * (margin / 100);
                                                        const grandTotal = sub + profit;

                                                        return (
                                                            <>
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="text-slate-500 font-bold">إجمالي التكلفة:</span>
                                                                    <span className="font-bold text-slate-700">${sub.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-xs text-emerald-600">
                                                                    <span className="font-bold">نسبة الربح ({margin}%):</span>
                                                                    <span className="font-bold">${profit.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                                    <span className="text-sm font-black text-[#5235E8]">الإجمالي النهائي:</span>
                                                                    <span className="text-lg font-black text-[#5235E8] px-3 py-1 bg-[#5235E8] bg-opacity-10 rounded-lg">
                                                                        ${grandTotal.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded: Linked Supplies */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-200 px-4 md:px-5 py-4 bg-[#F3F4F9]">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                    <Link2 className="h-4 w-4 text-[#8410ff]" />
                                                    <span className="text-[#8410ff]">بيانات توريدة الخامات لهذا الطلب</span>
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

                {/* Payment Modal */}
                <PaymentInstallmentModal
                    show={showPaymentModal}
                    customerName={customer?.name}
                    payments={payments}
                    onClose={() => setShowPaymentModal(false)}
                    onSave={handleSavePayment}
                    onDeletePayment={(paymentId) => {
                        if (window.confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
                            const all = JSON.parse(localStorage.getItem('customer_payments') || '[]');
                            localStorage.setItem('customer_payments', JSON.stringify(all.filter(p => p.id !== paymentId)));
                            toast.success('تم حذف الدفعة');
                            loadData();
                        }
                    }}
                />
            </div>
        </div>
    );
};

const PaymentInstallmentModal = ({ show, customerName, payments, onClose, onSave, onDeletePayment }) => {
    const [form, setForm] = useState({
        amount: '',
        method: 'CASH',
        notes: ''
    });

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors order-first">
                        <XCircle className="h-6 w-6 text-slate-400" />
                    </button>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 text-right">
                        <CreditCard className="h-6 w-6 text-emerald-600" />
                        سداد ومدفوعات العميل: {customerName}
                    </h3>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-8">
                    {/* Add Payment Form Section */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                        <h4 className="text-sm font-bold text-emerald-800 mb-4 text-right flex items-center justify-end gap-2">
                            تسجيل دفعة جديدة
                            <Plus className="h-4 w-4" />
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 text-right">المبلغ المسدد <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="مثال: 5000"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-right direction-ltr"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 text-right">طريقة الدفع</label>
                                <select
                                    value={form.method}
                                    onChange={e => setForm({ ...form, method: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none text-right"
                                >
                                    <option value="CASH">نقدي</option>
                                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                                    <option value="VODAFONE_CASH">فودافون كاش</option>
                                    <option value="CHECK">شيك</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2 text-right">ملاحظات</label>
                                <input
                                    type="text"
                                    placeholder="أي تفاصيل إضافية..."
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-right"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                onSave(form);
                                setForm({ amount: '', method: 'CASH', notes: '' });
                            }}
                            className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="h-5 w-5" />
                            تأكيد تسجيل الدفعة
                        </button>
                    </div>

                    {/* History Section */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-500 mb-4 text-right flex items-center justify-end gap-2">
                            سجل الدفعات السابقة
                            <Clock className="h-4 w-4" />
                        </h4>

                        {payments.length === 0 ? (
                            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm">لا توجد مدفوعات مسجلة بعد لهذا العميل.</p>
                            </div>
                        ) : (
                            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 text-slate-600 font-bold">التاريخ</th>
                                            <th className="px-4 py-3 text-slate-600 font-bold">المبلغ</th>
                                            <th className="px-4 py-3 text-slate-600 font-bold">الطريقة</th>
                                            <th className="px-4 py-3 text-slate-600 font-bold">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {payments.sort((a, b) => b.id - a.id).map(payment => (
                                            <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-600">{payment.date}</td>
                                                <td className="px-4 py-3 font-bold text-emerald-600">{payment.amount?.toLocaleString()} ج.م</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                                                        {payment.method === 'VODAFONE_CASH' ? 'فودافون' : payment.method === 'CASH' ? 'نقدي' : 'بنكي'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => onDeletePayment(payment.id)}
                                                        className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-10 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
                    >
                        إغلاق النافذة
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerOrders;
