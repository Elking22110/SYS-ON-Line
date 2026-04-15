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
    Calculator,
    DollarSign,
    CreditCard,
    Wallet,
    Info,
    X
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';
import { getCurrentDate, addDays } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import supabaseService from '../utils/supabaseService';
import toast from 'react-hot-toast';
import { printHtmlContent } from '../utils/printHelper.js';

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
    sizeWidth: '',
    sizeHeight: '',
    sizes: [], // For additional sizes
    bottomSize: '',
    bottomEnabled: false,
    thickness: '',
    quantity: '',
    pricePerKg: '',
    colorCount: '',
    clicheWidth: '',
    clicheHeight: '',
    clichePricePerCm: 0.85,
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
                    bottomEnabled: editingOrder.bottomEnabled !== undefined ? editingOrder.bottomEnabled : !!editingOrder.bottomSize,
                    sizes: editingOrder.sizes || [],
                    clichePricePerCm: editingOrder.clichePricePerCm !== undefined ? parseFloat(editingOrder.clichePricePerCm) : 0.85
                });
            } else {
                // Fetch default profit margin from settings
                const savedSettings = JSON.parse(localStorage.getItem('pos-settings') || '{}');
                const defaultMargin = savedSettings.orderProfitMargin !== undefined && savedSettings.orderProfitMargin !== '' ? savedSettings.orderProfitMargin : 10;

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
                    {/* Color and Thickness */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">اللون</label>
                            <input
                                type="text"
                                placeholder="مثال: أحمر، شفاف..."
                                value={form.color}
                                onChange={e => setForm({ ...form, color: e.target.value })}
                                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">السمك</label>
                            <input
                                type="text"
                                placeholder="مثال: 50 ميكرون"
                                value={form.thickness}
                                onChange={e => setForm({ ...form, thickness: e.target.value })}
                                className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Dimensions (Width x Height) */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-bold text-slate-700">المقاسات (عرض × طول) <span className="text-red-500">*</span></label>
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, sizes: [...(form.sizes || []), { width: '', height: '' }] })}
                                className="text-xs flex items-center gap-1 bg-purple-100 text-purple-700 font-bold px-2 py-1 rounded-lg hover:bg-purple-200 transition-colors"
                            >
                                + إضافة مقاس آخر
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <input
                                    type="number" step="any" placeholder="العرض الأساسي (سم)"
                                    value={form.sizeWidth} onChange={e => setForm({ ...form, sizeWidth: e.target.value })}
                                    className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                />
                            </div>
                            <div>
                                <input
                                    type="number" step="any" placeholder="الطول الأساسي (سم)"
                                    value={form.sizeHeight} onChange={e => setForm({ ...form, sizeHeight: e.target.value })}
                                    className="w-full px-4 py-2.5 text-right border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                />
                            </div>
                        </div>
                        {(form.sizes || []).map((s, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center mt-2 relative">
                                <input
                                    type="number" step="any" placeholder={`عرض مقاس ${idx + 2} (سم)`}
                                    value={s.width}
                                    onChange={e => {
                                        const newSizes = [...form.sizes];
                                        newSizes[idx].width = e.target.value;
                                        setForm({ ...form, sizes: newSizes });
                                    }}
                                    className="w-full px-3 py-2 text-right border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500 bg-white"
                                />
                                <input
                                    type="number" step="any" placeholder={`طول مقاس ${idx + 2} (سم)`}
                                    value={s.height}
                                    onChange={e => {
                                        const newSizes = [...form.sizes];
                                        newSizes[idx].height = e.target.value;
                                        setForm({ ...form, sizes: newSizes });
                                    }}
                                    className="w-full px-3 py-2 text-right border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500 bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newSizes = form.sizes.filter((_, i) => i !== idx);
                                        setForm({ ...form, sizes: newSizes });
                                    }}
                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Souffles Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2">
                            <Scissors className="h-5 w-5 text-indigo-600" />
                            <span className="text-sm font-bold text-slate-700">تفعيل السوفليهات؟</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, bottomEnabled: !form.bottomEnabled })}
                            className={`w-12 h-6 rounded-full transition-all relative ${form.bottomEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.bottomEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Souffles Input */}
                    {form.bottomEnabled && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">حجم السوفليهات</label>
                            <input
                                type="text"
                                placeholder="مثال: 5 سم"
                                value={form.bottomSize}
                                onChange={e => setForm({ ...form, bottomSize: e.target.value })}
                                className="w-full px-4 py-2.5 text-right border border-indigo-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-indigo-50 focus:bg-white"
                            />
                        </div>
                    )}

                    {/* Quantity + Price */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الكمية (كجم) <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="0"
                                step="any"
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
                                step="any"
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
                                        step="any"
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
                                        step="any"
                                        placeholder="عرض"
                                        value={form.clicheWidth}
                                        onChange={e => setForm({ ...form, clicheWidth: e.target.value })}
                                        className="w-full px-4 py-2.5 text-right direction-ltr border border-purple-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
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
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">سعر السنتيمتر <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0.85"
                                        value={form.clichePricePerCm}
                                        onChange={e => setForm({ ...form, clichePricePerCm: e.target.value })}
                                        className="w-full px-4 py-2.5 text-right direction-ltr border border-purple-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-purple-600 font-bold bg-white p-2 rounded-lg border border-purple-100 flex justify-between">
                                <span>تكلفة الأكلشية التقريبية:</span>
                                <span>
                                    {((parseFloat(form.clicheHeight) || 0) * (parseFloat(form.clicheWidth) || 0) * (parseFloat(form.colorCount) || 0) * (parseFloat(form.clichePricePerCm) || 0.85)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ج.م
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
                                step="any"
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
                                step="any"
                                placeholder="0.00"
                                value={form.cuttingCostPerKg}
                                onChange={e => setForm({ ...form, cuttingCostPerKg: e.target.value })}
                                className="w-full px-4 py-2.5 text-right direction-ltr border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
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

    // Size Management
    const [showSizeModal, setShowSizeModal] = useState(false);
    const [sizeForm, setSizeForm] = useState({ name: '', width: '', height: '' });

    // Payment Management
    const [payments, setPayments] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Order Completion
    const [completionModalOrder, setCompletionModalOrder] = useState(null);
    const [netDeliveredQuantity, setNetDeliveredQuantity] = useState('');
    const [completionPaymentAmount, setCompletionPaymentAmount] = useState('');
    const [completionPaymentMethod, setCompletionPaymentMethod] = useState('CASH');

    // ─── Load ────────────────────────────────────────────────
    const loadData = React.useCallback(async () => {
        // Customer - try cloud first, fallback to local
        try {
            const cloudCustomers = await supabaseService.getCustomers();
            if (cloudCustomers && cloudCustomers.length > 0) {
                // Save merged cloud data to localStorage
                localStorage.setItem('customers', JSON.stringify(cloudCustomers));
                const found = cloudCustomers.find(c => c.id?.toString() === id);
                setCustomer(found || null);
            } else {
                const localCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
                const found = localCustomers.find(c => c.id?.toString() === id);
                setCustomer(found || null);
            }
        } catch (e) {
            const localCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
            const found = localCustomers.find(c => c.id?.toString() === id);
            setCustomer(found || null);
        }

        // Orders - try Supabase first, fallback to localStorage
        try {
            const cloudOrders = await supabaseService.getCustomerOrders(id);
            if (cloudOrders && cloudOrders.length > 0) {
                // Merge cloud with local (cloud wins for status fields)
                const localOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
                const merged = cloudOrders.map(co => {
                    const lo = localOrders.find(o => o.id?.toString() === co.id?.toString());
                    if (!lo) return co;
                    // Safe merge: cloud wins only when its value is non-null and non-empty string
                    // This prevents cloud nulls from overwriting correct local values (e.g. sizeWidth, sizeHeight)
                    const safeCloud = {};
                    Object.keys(co).forEach(key => {
                        const cloudVal = co[key];
                        if (cloudVal !== null && cloudVal !== undefined && cloudVal !== '') {
                            safeCloud[key] = cloudVal;
                        }
                    });
                    return { ...lo, ...safeCloud };
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
        const onDataUpdate = () => loadData();
        const unsubPayments = subscribe(EVENTS.CUSTOMER_PAYMENTS_CHANGED, loadData);
        window.addEventListener('dataUpdated', onDataUpdate);
        window.addEventListener('storage', onDataUpdate);

        return () => {
            if (unsubCustomers) unsubCustomers();
            if (unsubInvoices) unsubInvoices();
            if (unsubSuppliers) unsubSuppliers();
            if (unsubOrders) unsubOrders();
            if (unsubPayments) unsubPayments();
            window.removeEventListener('dataUpdated', onDataUpdate);
            window.removeEventListener('storage', onDataUpdate);
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
        const grandTotal = subtotal + (qty * margin);

        const orderSupplies = getOrderLinkedSupplies(order.id);

        let logoHtml = '';
        if (storeLogo) {
            logoHtml = `<div style="text-align: center; margin-bottom: 20px;">
                <img src="${storeLogo}" style="max-height: 80px; max-width: 100%; object-fit: contain;" onload="window.print()" onerror="window.print()" />
            </div>`;
        } else {
            // If no logo, we print immediately
            setTimeout(() => { if (printWindow.print) printWindow.print(); }, 500);
        }

        const html = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة طلب تشغيل - ${order.orderNumber}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #111; line-height: 1.7; background: #fff; }
                    .header { text-align: center; border-bottom: 3px solid #5235E8; padding-bottom: 16px; margin-bottom: 24px; }
                    .header h1 { color: #5235E8; font-size: 26px; font-weight: 900; margin-bottom: 4px; }
                    .header p { color: #555; font-size: 14px; }
                    .badge { display: inline-block; background: #5235E8; color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-top: 8px; }
                    .section { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; }
                    .section-title { font-weight: bold; background: #5235E8; color: #fff; padding: 8px 14px; font-size: 14px; letter-spacing: 0.5px; }
                    .row { display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; padding: 7px 14px; align-items: center; }
                    .row:last-child { border-bottom: none; }
                    .label { color: #555; font-size: 13px; }
                    .value { font-weight: bold; font-size: 13px; color: #111; }
                    .totals { margin-top: 24px; background: #f0eeff; border: 2px solid #5235E8; border-radius: 10px; padding: 14px 16px; }
                    .grand-total { display: flex; justify-content: space-between; align-items: center; }
                    .grand-total .label { font-size: 16px; font-weight: 700; color: #5235E8; }
                    .grand-total .value { font-size: 22px; font-weight: 900; color: #5235E8; }
                    .supply-box { margin-top: 12px; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; background: #f0fdf4; }
                    .supply-box-title { font-weight: bold; color: #166534; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid #86efac; padding-bottom: 4px; }
                    .supply-row { display: flex; justify-content: space-between; font-size: 12px; color: #166534; padding: 2px 0; }
                    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
                    @media print {
                        @page { margin: 0; }
                        body { padding: 1.5cm; }
                        button { display: none !important; }
                    }
                </style>
            </head>
            <body>
                ${logoHtml}
                <div class="header">
                    <h1>MS-GROUP</h1>
                    <span class="badge">فاتورة طلب تشغيل</span>
                    <p style="margin-top: 8px; color: #333; font-weight: bold;">رقم الطلب: ${order.orderNumber}</p>
                </div>

                <div class="section">
                    <div class="section-title">بيانات العميل</div>
                    <div class="row"><span class="label">اسم العميل:</span><span class="value">${customer.name}</span></div>
                    <div class="row"><span class="label">رقم الهاتف:</span><span class="value">${customer.phone || '-'}</span></div>
                    <div class="row"><span class="label">تاريخ الطلب:</span><span class="value">${order.date}</span></div>
                    <div class="row"><span class="label">تاريخ التسليم:</span><span class="value">${order.deliveryDate || '-'}</span></div>
                </div>

                <div class="section">
                    <div class="section-title">تفاصيل التصنيع</div>
                    <div class="row"><span class="label">نوع المنتج:</span><span class="value">${order.productType || '-'}</span></div>
                    <div class="row"><span class="label">اللون:</span><span class="value">${order.color || '-'}</span></div>
                    <div class="row"><span class="label">المقاس الأساسي:</span><span class="value">${order.sizeWidth && order.sizeHeight ? order.sizeWidth + ' (عرض) × ' + order.sizeHeight + ' (طول) سم' : '-'}</span></div>
                    ${Array.isArray(order.sizes) && order.sizes.length > 0 ? order.sizes.map((s, i) => `<div class="row"><span class="label">مقاس ${i + 2}:</span><span class="value">${s.width} (عرض) × ${s.height} (طول) سم</span></div>`).join('') : ''}
                    <div class="row"><span class="label">سوفليهات:</span><span class="value">${order.bottomEnabled ? (order.bottomSize || '-') : 'بدون سوفليهات'}</span></div>
                    <div class="row"><span class="label">السمك:</span><span class="value">${order.thickness || '-'}</span></div>
                    <div class="row"><span class="label">الوزن / الكمية:</span><span class="value">${order.status === 'CLOSED' ? 'الصافي المسلم' : 'الكمية المطلوبة'}</span></div>
                    <div class="row"><span class="label">الوزن الفعلي:</span><span class="value">${qty} كجم</span></div>
                    ${order.status === 'CLOSED' && order.orderedQuantity ? `
                        <div class="row"><span class="label">الكمية المطلوبة أصلاً:</span><span class="value">${order.orderedQuantity} كجم</span></div>
                    ` : ''}
                    ${order.clicheEnabled ? `
                        <div class="row"><span class="label">مقاس الأكلشية:</span><span class="value">${order.clicheHeight} × ${order.clicheWidth}</span></div>
                        <div class="row"><span class="label">عدد الألوان:</span><span class="value">${order.colorCount} لون</span></div>
                    ` : ''}
                    ${orderSupplies.length > 0 ? `
                        <div style="padding: 10px 14px;">
                            <div class="supply-box">
                                <div class="supply-box-title">بيانات توريد الخامات:</div>
                                ${orderSupplies.map(s => `
                                    <div class="supply-row">
                                        <span>المورد: <strong>${s.supplierName}</strong></span>
                                        <span>رقم التوريدة: <strong>${s.supplyNumber || s.id}</strong></span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="totals">
                    <div class="grand-total">
                        <span class="label">إجمالي قيمة الفاتورة:</span>
                        <span class="value">${grandTotal.toLocaleString()} ج.م</span>
                    </div>
                </div>

                <div class="footer">
                    نظام إدارة الفاتورة &mdash; elking<br>
                    ت: 01553448631
                </div>
            </body>
            </html>
        `;

        printHtmlContent(html);
    };


    // ─── Helpers ────────────────────────────────────────────
    const calculateOrderTotal = (order) => {
        const qty = parseFloat(order.quantity) || 0;
        const pricePerKg = parseFloat(order.pricePerKg) || 0;
        const printingCostPerKg = parseFloat(order.printingCostPerKg) || 0;
        const cuttingCostPerKg = parseFloat(order.cuttingCostPerKg) || 0;
        const profitMargin = parseFloat(order.profitMargin) || 0;
        const clicheCost = order.clicheEnabled ? (parseFloat(order.clicheCost) || 0) : 0;

        const subtotal = qty * (pricePerKg + printingCostPerKg + cuttingCostPerKg + profitMargin);
        return subtotal + clicheCost;
    };

    // ─── CRUD ────────────────────────────────────────────────
    const handleSaveOrder = async (formToSave) => {
        // Validation for required fields
        const requiredFields = [
            { key: 'productType', label: 'نوع المنتج' },
            { key: 'sizeWidth', label: 'عرض المقاس الأساسي' },
            { key: 'sizeHeight', label: 'طول المقاس الأساسي' },
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
                        quantity: parseFloat(formToSave.quantity) || 0,
                        pricePerKg: parseFloat(formToSave.pricePerKg) || 0,
                        colorCount: parseFloat(formToSave.colorCount) || 0,
                        clicheWidth: parseFloat(formToSave.clicheWidth) || 0,
                        clicheHeight: parseFloat(formToSave.clicheHeight) || 0,
                        sizeWidth: parseFloat(formToSave.sizeWidth) || 0,
                        sizeHeight: parseFloat(formToSave.sizeHeight) || 0,
                        printingCostPerKg: parseFloat(formToSave.printingCostPerKg) || 0,
                        cuttingCostPerKg: parseFloat(formToSave.cuttingCostPerKg) || 0,
                        clicheEnabled: formToSave.clicheEnabled || false,
                        clichePricePerCm: parseFloat(formToSave.clichePricePerCm) || 0.85,
                        clicheCost: formToSave.clicheEnabled ? ((parseFloat(formToSave.clicheHeight) || 0) * (parseFloat(formToSave.clicheWidth) || 0) * (parseFloat(formToSave.colorCount) || 0) * (parseFloat(formToSave.clichePricePerCm) || 0.85)) : 0,
                        profitMargin: parseFloat(formToSave.profitMargin) || 0,
                        totalPrice: calculateOrderTotal({
                            ...formToSave,
                            clicheCost: formToSave.clicheEnabled ? ((parseFloat(formToSave.clicheHeight) || 0) * (parseFloat(formToSave.clicheWidth) || 0) * (parseFloat(formToSave.colorCount) || 0) * (parseFloat(formToSave.clichePricePerCm) || 0.85)) : 0
                        })
                    }
                    : o
            );
            localStorage.setItem('customer_orders', JSON.stringify(updated));
            // Sync to Supabase
            const finalClicheCost = formToSave.clicheEnabled ? ((parseFloat(formToSave.clicheHeight) || 0) * (parseFloat(formToSave.clicheWidth) || 0) * (parseFloat(formToSave.colorCount) || 0) * (parseFloat(formToSave.clichePricePerCm) || 0.85)) : 0;
            await supabaseService.updateCustomerOrder(editingOrder.id, {
                ...formToSave,
                clichePricePerCm: parseFloat(formToSave.clichePricePerCm) || 0.85,
                profitMargin: parseFloat(formToSave.profitMargin) || 0,
                clicheCost: finalClicheCost,
                totalPrice: calculateOrderTotal({ ...formToSave, clicheCost: finalClicheCost, clicheEnabled: formToSave.clicheEnabled })
            });
            toast.success('تم تحديث الطلب بنجاح');
        } else {
            // Create
            const clicheCost = formToSave.clicheEnabled ? ((parseFloat(formToSave.clicheHeight) || 0) * (parseFloat(formToSave.clicheWidth) || 0) * (parseFloat(formToSave.colorCount) || 0) * (parseFloat(formToSave.clichePricePerCm) || 0.85)) : 0;
            const newOrder = {
                id: Date.now(),
                customerId: id,
                customerName: customer?.name || '',
                orderNumber: generateOrderNumber(),
                date: getCurrentDate().split('T')[0],
                ...formToSave,
                quantity: parseFloat(formToSave.quantity) || 0,
                pricePerKg: parseFloat(formToSave.pricePerKg) || 0,
                colorCount: parseFloat(formToSave.colorCount) || 0,
                clicheWidth: parseFloat(formToSave.clicheWidth) || 0,
                clicheHeight: parseFloat(formToSave.clicheHeight) || 0,
                sizeWidth: parseFloat(formToSave.sizeWidth) || 0,
                sizeHeight: parseFloat(formToSave.sizeHeight) || 0,
                clichePricePerCm: parseFloat(formToSave.clichePricePerCm) || 0.85,
                printingCostPerKg: parseFloat(formToSave.printingCostPerKg) || 0,
                cuttingCostPerKg: parseFloat(formToSave.cuttingCostPerKg) || 0,
                clicheEnabled: formToSave.clicheEnabled || false,
                clicheCost: clicheCost,
                profitMargin: parseFloat(formToSave.profitMargin) || 0,
                totalPrice: calculateOrderTotal({ ...formToSave, clicheCost, clicheEnabled: formToSave.clicheEnabled })
            };
            localStorage.setItem('customer_orders', JSON.stringify([...allOrders, newOrder]));
            // Sync to Supabase
            await supabaseService.addCustomerOrder(newOrder);
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

    const handleDeleteOrder = async (orderId) => {
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
        await supabaseService.deleteCustomerOrder(orderId);
        soundManager.play('delete');
        toast.success('تم حذف الطلب');
        loadData();
    };

    const handleSavePayment = async (paymentData) => {
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
        const activeShiftForPayment = JSON.parse(localStorage.getItem('activeShift') || 'null');
        
        const newPayment = {
            id: Date.now(),
            customerId: id,
            customerName: customer?.name || '',
            date: getCurrentDate().split('T')[0],
            amount: amount,
            shiftId: activeShiftForPayment?.id || null,
            note: paymentData.notes || ''
        };

        allPayments.push(newPayment);
        localStorage.setItem('customer_payments', JSON.stringify(allPayments));
        // Sync to Supabase
        await supabaseService.addCustomerPayment(newPayment);

        toast.success('تم تسجيل الدفعة بنجاح');
        soundManager.play('save');
        setShowPaymentModal(false);
        loadData();
    };

    const handleChangeStatus = async (order, newStatus) => {
        if (newStatus === 'DONE') {
            soundManager.play('openWindow');
            setCompletionModalOrder(order);
            setNetDeliveredQuantity('');
            setCompletionPaymentAmount('');
            setCompletionPaymentMethod('CASH');
            return;
        }

        const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        const updatedOrd = { ...order, status: newStatus };
        const updated = allOrders.map(o => o.id === order.id ? updatedOrd : o);
        localStorage.setItem('customer_orders', JSON.stringify(updated));
        // Sync to Supabase
        await supabaseService.updateCustomerOrder(order.id, updatedOrd);
        soundManager.play('save');
        loadData();

        // عرض تنبيه طباعة الفاتورة عند الانتهاء من الطلب (مغلق)
        if (newStatus === 'CLOSED') {
            setTimeout(() => {
                if (window.confirm('ممتاز! تم إغلاق الأوردر، هل ترغب في طباعة فاتورة الحساب النهائية الآن للعميل؟')) {
                    handlePrintOrder(updatedOrd);
                }
            }, 600);
        }
    };

    const handleConfirmCompletion = async () => {
        const netQty = parseFloat(netDeliveredQuantity);
        if (isNaN(netQty) || netQty <= 0) {
            toast.error('يرجى إدخال كمية صحيحة أكبر من الصفر');
            soundManager.play('error');
            return;
        }

        const order = completionModalOrder;
        const linked = getOrderLinkedSupplies(order.id);
        const originalQty = parseFloat(order.quantity);
        let updatedSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
        
        let wasteAmountForOrder = 0;
        if (linked.length > 0) {
            const supply = linked[0];
            const totalSuppliedQty = parseFloat(supply.quantity) || 0;
            wasteAmountForOrder = Math.max(0, totalSuppliedQty - netQty);
            
            updatedSupplies = updatedSupplies.map(s => 
                s.id === supply.id 
                ? { ...s, wasteQuantity: wasteAmountForOrder, netDeliveredQuantity: netQty } 
                : s
            );
            localStorage.setItem('supplier_supplies', JSON.stringify(updatedSupplies));
            
            // Sync to supabase
            try {
                await supabaseService.updateSetting('supplier_supplies', JSON.stringify(updatedSupplies));
            } catch(e) { console.error('Error updating supply waste', e)}
        }

        const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        const activeShiftForOrder = JSON.parse(localStorage.getItem('activeShift') || 'null');
        
        const updatedOrd = { 
            ...order, 
            status: 'CLOSED', // يتم الإغلاق فوراً
            orderedQuantity: originalQty,
            quantity: netQty,
            wasteQuantity: wasteAmountForOrder,
            closedAt: new Date().toISOString(),
            shiftId: activeShiftForOrder?.id || order.shiftId || null,
            totalPrice: calculateOrderTotal({ ...order, quantity: netQty })
        };
        const updated = allOrders.map(o => o.id === order.id ? updatedOrd : o);
        localStorage.setItem('customer_orders', JSON.stringify(updated));
        
        await supabaseService.updateCustomerOrder(order.id, updatedOrd);

        // --- NEW PAYMENT LOGIC ---
        const amountToPay = parseFloat(completionPaymentAmount);
        if (amountToPay > 0) {
            const allPayments = JSON.parse(localStorage.getItem('customer_payments') || '[]');
            const newPayment = {
                id: Date.now() + 1,
                customerId: id,
                customerName: customer?.name || '',
                date: getCurrentDate().split('T')[0],
                amount: amountToPay,
                method: completionPaymentMethod,
                shiftId: activeShiftForOrder?.id || null,
                note: `دفعة عند إغلاق الأوردر ${updatedOrd.orderNumber}`
            };
            allPayments.push(newPayment);
            localStorage.setItem('customer_payments', JSON.stringify(allPayments));
            await supabaseService.addCustomerPayment(newPayment);
            setPayments(prev => [...prev, newPayment]);
        }
        
        setCompletionModalOrder(null);
        setNetDeliveredQuantity('');
        setCompletionPaymentAmount('');
        setCompletionPaymentMethod('CASH');
        soundManager.play('save');
        toast.success(amountToPay > 0 ? 'تم إنهاء الطلب وتسجيل الدفعة بنجاح' : 'تم إنهاء وإغلاق الطلب بنجاح وتحديد الهالك.');
        loadData();

        setTimeout(() => {
            if (window.confirm('تمت العملية وتسجيل الفاتورة بناء على الصافي. هل ترغب في طباعة الفاتورة النهائية الآن؟')) {
                handlePrintOrder(updatedOrd);
            }
        }, 600);
    };

    const handleAddCustomerCliche = async () => {
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

    const handleDeleteCustomerCliche = async (clicheId) => {
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

    const handleAddCustomerSize = async () => {
        if (!sizeForm.name || !sizeForm.width || !sizeForm.height) {
            toast.error('يرجى إدخال اسم ومقاس المنتج');
            return;
        }

        const dimensions = `${sizeForm.width} × ${sizeForm.height}`;
        const sizeToSave = { name: sizeForm.name, width: sizeForm.width, height: sizeForm.height, dimensions };

        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        let updatedCustomer = null;
        const updatedCustomers = customers.map(c => {
            if (c.id?.toString() === id) {
                const currentSizes = Array.isArray(c.profileSizes) ? c.profileSizes : [];
                updatedCustomer = {
                    ...c,
                    profileSizes: [...currentSizes, { id: Date.now(), ...sizeToSave }]
                };
                return updatedCustomer;
            }
            return c;
        });

        if (updatedCustomer) {
            localStorage.setItem('customers', JSON.stringify(updatedCustomers));
            supabaseService.updateCustomer(updatedCustomer.id, updatedCustomer).catch(console.error);
            toast.success('تم إضافة المقاس للملف الشخصي');
            soundManager.play('save');
            setSizeForm({ name: '', width: '', height: '' });
            setShowSizeModal(false);
            loadData();
            publish(EVENTS.CUSTOMERS_CHANGED);
        }
    };

    const handleDeleteCustomerSize = async (sizeId) => {
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        let updatedCustomer = null;
        const updatedCustomers = customers.map(c => {
            if (c.id?.toString() === id) {
                const currentSizes = Array.isArray(c.profileSizes) ? c.profileSizes : [];
                updatedCustomer = {
                    ...c,
                    profileSizes: currentSizes.filter(item => item.id !== sizeId)
                };
                return updatedCustomer;
            }
            return c;
        });

        if (updatedCustomer) {
            localStorage.setItem('customers', JSON.stringify(updatedCustomers));
            supabaseService.updateCustomer(updatedCustomer.id, updatedCustomer).catch(console.error);
            toast.success('تم حذف المقاس');
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
    const closedOrders = orders.filter(o => o.status === 'CLOSED');
    const totalQuantityOrdered = closedOrders.reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0);
    const totalOrdersAmount = closedOrders.reduce((sum, o) => {
        const qty = parseFloat(o.quantity) || 0;
        const productPrice = parseFloat(o.pricePerKg) || 0;
        const printing = parseFloat(o.printingCostPerKg) || 0;
        const cutting = parseFloat(o.cuttingCostPerKg) || 0;
        const margin = parseFloat(o.profitMargin) || 0;
        const price = productPrice + printing + cutting + margin;
        
        const subtotal = qty * price;
        const cliche = o.clicheEnabled ? (parseFloat(o.clicheCost) || 0) : 0;

        return sum + subtotal + cliche;
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
                    <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
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

                        <div className="bg-blue-100 border border-blue-200 rounded-xl p-3 flex items-start gap-3 transition-all hover:bg-blue-200/50 shadow-sm">
                            <div className="bg-blue-500/20 p-2 rounded-lg">
                                <Hash className="h-4 w-4 text-blue-700 flex-shrink-0" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-blue-700 uppercase tracking-wider mb-0.5 font-bold">المقاس</p>
                                <p className="text-sm font-black text-slate-900 truncate">
                                    {customer.sizeWidth && customer.sizeHeight
                                        ? `${customer.sizeWidth} × ${customer.sizeHeight}`
                                        : 'غير محدد'}
                                </p>
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
                                <p className="text-[10px] text-cyan-700 uppercase tracking-wider mb-0.5 font-bold">الأكلشية الأساسي</p>
                                <p className="text-sm font-black text-slate-900 truncate">
                                    {customer.clicheHeight && customer.clicheWidth
                                        ? `${customer.clicheHeight} × ${customer.clicheWidth}`
                                        : customer.cliche || 'غير محدد'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Profile Cliches & Sizes (Additional) */}
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
                        {Array.isArray(customer.profileSizes) && customer.profileSizes.map(ps => (
                            <div key={ps.id} className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start justify-between gap-3 transition-all hover:shadow-md group">
                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <Tag className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#006af8] mb-0.5 font-medium">{ps.name}</p>
                                        <p className="text-sm font-bold text-slate-700">{ps.dimensions} سم</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteCustomerSize(ps.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                        {/* Add More Buttons */}
                        <div
                            onClick={() => setShowClicheModal(true)}
                            className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-all group min-h-[60px]"
                        >
                            <Plus className="h-4 w-4 text-slate-400 group-hover:text-purple-600" />
                            <span className="text-sm font-bold text-slate-500 group-hover:text-purple-600">أضف أكلشية جديد</span>
                        </div>
                        <div
                            onClick={() => setShowSizeModal(true)}
                            className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-all group min-h-[60px]"
                        >
                            <Plus className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                            <span className="text-sm font-bold text-slate-500 group-hover:text-blue-600">أضف مقاس جديد</span>
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

                {/* --- CUSTOMER SIZE MODAL --- */}
                {showSizeModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Tag className="h-5 w-5 text-blue-600" />
                                إضافة مقاس لملف العميل
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">اسم/وصف المقاس</label>
                                    <input
                                        type="text"
                                        placeholder="مثال: شنطة كارفور"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={sizeForm.name}
                                        onChange={e => setSizeForm({ ...sizeForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">العرض (سم)</label>
                                        <input
                                            type="number"
                                            placeholder="مثال: 30"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                            value={sizeForm.width}
                                            onChange={e => setSizeForm({ ...sizeForm, width: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">الطول (سم)</label>
                                        <input
                                            type="number"
                                            placeholder="مثال: 40"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                            value={sizeForm.height}
                                            onChange={e => setSizeForm({ ...sizeForm, height: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={handleAddCustomerSize}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all"
                                >
                                    حفظ المقاس
                                </button>
                                <button
                                    onClick={() => setShowSizeModal(false)}
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
                                                    className="text-white bg-indigo-600 hover:bg-indigo-700 action-button shadow-md"
                                                    title="معاينة وطباعة الفاتورة"
                                                >
                                                    <Printer />
                                                </button>
                                                <button
                                                    onClick={() => handleEditOrder(order)}
                                                    className="text-white bg-blue-600 hover:bg-blue-700 action-button shadow-md"
                                                    title="تعديل"
                                                >
                                                    <Edit />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="text-white bg-red-600 hover:bg-red-700 action-button shadow-md"
                                                    title="حذف"
                                                >
                                                    <Trash2 />
                                                </button>
                                                <button
                                                    onClick={() => toggleExpand(order.id)}
                                                    className="text-white bg-slate-700 hover:bg-slate-800 action-button shadow-md"
                                                    title="عرض التفاصيل"
                                                >
                                                    {isExpanded ? <ChevronUp /> : <ChevronDown />}
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
                                                <p className="text-[12px] font-black text-blue-800 uppercase tracking-wider mb-1">نوع المنتج</p>
                                                <p className="text-[15px] font-black text-slate-800">{order.productType || '-'}</p>
                                            </div>
                                            {order.status === 'CLOSED' ? (
                                                <>
                                                    <div className="bg-emerald-100/50 border-2 border-emerald-500 rounded-2xl p-3 shadow-md flex-1 transform scale-105 transition-all">
                                                        <p className="text-[11px] font-black text-emerald-800 uppercase mb-0.5 tracking-tighter">الصافي المسلم (الأساسي)</p>
                                                        <p className="text-[17px] font-black text-emerald-600">{order.quantity?.toLocaleString()} <small className="text-[11px]">كجم</small></p>
                                                    </div>
                                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 shadow-sm opacity-80">
                                                        <p className="text-[10px] font-bold text-orange-800 uppercase mb-0.5">المطلوب</p>
                                                        <p className="text-[13px] font-bold text-orange-600">{(parseFloat(order.orderedQuantity) || parseFloat(order.quantity))?.toLocaleString()} <small className="text-[10px]">كجم</small></p>
                                                    </div>
                                                    <div className="bg-red-50 border border-red-100 rounded-xl p-2.5 shadow-sm opacity-80">
                                                        <p className="text-[10px] font-bold text-red-800 uppercase mb-0.5">الهالك</p>
                                                        <p className="text-[13px] font-bold text-red-600">{order.wasteQuantity?.toLocaleString() || '0'} <small className="text-[10px]">كجم</small></p>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 shadow-sm">
                                                    <p className="text-xs font-black text-orange-800 uppercase tracking-wider mb-1">الكمية</p>
                                                    <p className="text-[15px] font-black text-orange-600">{order.quantity?.toLocaleString()} <small className="text-[11px]">كجم</small></p>
                                                </div>
                                            )}
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 shadow-sm">
                                                <p className="text-xs font-black text-indigo-800 uppercase tracking-wider mb-1">اللون / المقاس</p>
                                                <p className="text-[15px] font-black text-slate-800">
                                                    {order.color || order.size ? `${order.color || '-'} / ${order.size || '-'}` : '-'}
                                                </p>
                                            </div>
                                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 shadow-sm">
                                                <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">سفليات / سمك</p>
                                                <p className="text-[15px] font-black text-slate-800">
                                                    {order.bottomSize || order.thickness ? `${order.bottomSize || '-'} / ${order.thickness || '-'}` : '-'}
                                                </p>
                                            </div>
                                            <div className={`rounded-lg p-2.5 shadow-sm border ${orderSupplies.length > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                                <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-1">توفير الخامات</p>
                                                <div className={`text-sm font-black ${orderSupplies.length > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {orderSupplies.length > 0 ? (
                                                        <div className="space-y-0.5">
                                                            {orderSupplies.map((s, idx) => (
                                                                <div key={s.id || idx} className="flex flex-col leading-tight">
                                                                    <span className="text-[13px] leading-tight truncate">{s.supplierName}</span>
                                                                    <span className="text-[10px] opacity-75 font-bold">التوريدة: {s.supplyNumber || s.id?.toString().slice(-6)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : 'لم يتم توفير خامات'}
                                                </div>
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
                                        <div className="mt-4 p-5 bg-slate-50/80 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                            <h4 className="text-[15px] font-black text-indigo-700 border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                                                <Calculator className="h-4 w-4" />
                                                تفصيل الحساب الربحي والإنتاج:
                                            </h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Production Costs */}
                                                <div className="space-y-3">
                                                        <span className="text-slate-600 font-bold flex items-center gap-2">
                                                            <Package className="h-4 w-4 text-slate-400" />
                                                            تكلفة الخامة ({order.status === 'CLOSED' ? `الصافي ${order.quantity}` : `${order.quantity}`} كجم):
                                                        </span>
                                                        <span className="font-black text-slate-900">${(order.quantity * (order.pricePerKg || 0)).toLocaleString()}</span>

                                                    {order.printingCostPerKg > 0 && (
                                                        <div className="flex justify-between items-center text-[15px]">
                                                            <span className="text-slate-600 font-bold flex items-center gap-2"><Printer className="h-4 w-4 text-slate-400" /> تكلفة المطبعه:</span>
                                                            <span className="font-black text-slate-900">${(order.quantity * order.printingCostPerKg).toLocaleString()}</span>
                                                        </div>
                                                    )}

                                                    {order.cuttingCostPerKg > 0 && (
                                                        <div className="flex justify-between items-center text-[15px]">
                                                            <span className="text-slate-600 font-bold flex items-center gap-2"><Scissors className="h-4 w-4 text-slate-400" /> تكلفة المقص:</span>
                                                            <span className="font-black text-slate-900">${(order.quantity * order.cuttingCostPerKg).toLocaleString()}</span>
                                                        </div>
                                                    )}

                                                    {order.clicheEnabled && order.clicheCost > 0 && (
                                                        <div className="flex justify-between items-center text-[15px]">
                                                            <span className="text-slate-600 font-bold flex items-center gap-2"><Layers className="h-4 w-4 text-slate-400" /> تكلفة الأكلشية:</span>
                                                            <span className="font-black text-slate-900">${(order.clicheCost || 0).toLocaleString()}</span>
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
                                                        const profit = order.quantity * margin;
                                                        const grandTotal = sub + profit;

                                                        return (
                                                            <>
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="text-slate-500 font-bold">إجمالي التكلفة:</span>
                                                                    <span className="font-bold text-slate-700">${sub.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-xs text-emerald-600">
                                                                    <span className="font-bold">قيمة الربح ({margin} ج/كجم):</span>
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
            {/* Order Completion Modal */}
            {completionModalOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                            إنهاء الطلب: الصافي والهالك
                        </h2>
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 space-y-3 font-bold text-right direction-rtl">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">الكمية المطلوبة للعميل:</span>
                                <span className="text-blue-600 font-bold">{completionModalOrder.quantity} كجم</span>
                            </div>
                            
                            {getOrderLinkedSupplies(completionModalOrder.id).length > 0 && (
                                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                                    <span className="text-slate-500">الخام المُرسل من المورد:</span>
                                    <span className="text-orange-600 font-bold">
                                        {getOrderLinkedSupplies(completionModalOrder.id)[0].quantity} كجم
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mb-6 text-right direction-rtl space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-emerald-700 mb-2">الصافي المُسلم للعميل (كجم)</label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="مثال: 45"
                                    value={netDeliveredQuantity}
                                    onChange={(e) => setNetDeliveredQuantity(e.target.value)}
                                    className="w-full px-4 py-3 text-center text-xl font-extrabold border-2 border-emerald-300 focus:border-emerald-500 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all bg-white direction-ltr"
                                    autoFocus
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    * هذا هو الرقم الذي سيبنى عليه حساب الفاتورة. الجزء المتبقي سيُحسب كـ "هالك".
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-200">
                                <label className="block text-sm font-bold text-blue-700 mb-2">المبلغ المسدد الآن (اختياري)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            placeholder="المبلغ (ج.م)"
                                            value={completionPaymentAmount}
                                            onChange={(e) => setCompletionPaymentAmount(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 text-center text-lg font-bold border-2 border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all bg-slate-50 direction-ltr"
                                        />
                                    </div>
                                    <select
                                        value={completionPaymentMethod}
                                        onChange={(e) => setCompletionPaymentMethod(e.target.value)}
                                        className="w-full px-4 py-2.5 text-center text-sm font-bold border-2 border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all bg-slate-50 appearance-none"
                                    >
                                        <option value="CASH">نقدي</option>
                                        <option value="VODAFONE_CASH">فودافون كاش</option>
                                        <option value="BANK_TRANSFER">تحويل بنكي</option>
                                        <option value="CHECK">شيك</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => { setCompletionModalOrder(null); soundManager.play('closeWindow'); }}
                                className="flex-1 px-4 py-3 text-slate-700 bg-slate-100 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleConfirmCompletion}
                                className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="h-5 w-5" />
                                تأكيد الصافي وإنهاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                                                        {payment.method === 'VODAFONE_CASH' ? 'فودافون كاش' : 
                                                         payment.method === 'CASH' ? 'نقدي' : 
                                                         payment.method === 'BANK_TRANSFER' ? 'تحويل بنكي' : 
                                                         payment.method === 'CHECK' ? 'شيك' : 'أخرى'}
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
