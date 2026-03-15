import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    User,
    Phone,
    Mail,
    Calendar,
    DollarSign,
    Package,
    Plus,
    CreditCard,
    FileText,
    Trash2,
    AlertTriangle,
    Link2,
    X,
    Printer
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';
import { formatDate, getCurrentDate } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import supabaseService from '../utils/supabaseService';

const SupplierDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [supplier, setSupplier] = useState(null);
    const [supplies, setSupplies] = useState([]);
    const [payments, setPayments] = useState([]);

    // Modals state
    const [showSupplyModal, setShowSupplyModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Open orders for linking
    const [openOrders, setOpenOrders] = useState([]);

    // Forms state
    const [newSupply, setNewSupply] = useState({
        productName: '',
        quantity: '',
        unitPrice: '',
        paidAmount: '0',
        linkedOrderId: ''
    });

    const [newPayment, setNewPayment] = useState({
        amount: '',
        paymentMethod: 'نقدي',
        notes: ''
    });

    const [activeTab, setActiveTab] = useState('supplies'); // 'supplies' or 'payments'

    useEffect(() => {
        loadData();

        // Listen to changes for real-time sync
        const unsubSuppliers = subscribe(EVENTS.SUPPLIERS_CHANGED, loadData);
        const unsubInvoices = subscribe(EVENTS.INVOICES_CHANGED, loadData);
        const unsubCustomers = subscribe(EVENTS.CUSTOMERS_CHANGED, loadData);
        const unsubOrders = subscribe(EVENTS.CUSTOMER_ORDERS_CHANGED, loadData);

        return () => {
            if (unsubSuppliers) unsubSuppliers();
            if (unsubInvoices) unsubInvoices();
            if (unsubCustomers) unsubCustomers();
            if (unsubOrders) unsubOrders();
        };
    }, [id]);

    const loadData = () => {
        // Load Supplier Data
        const suppliersData = JSON.parse(localStorage.getItem('suppliers') || '[]');
        const currentSupplier = suppliersData.find(s => s.id.toString() === id);
        if (currentSupplier) {
            setSupplier(currentSupplier);
        }

        // Load Supplies
        const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
        const supplierSupplies = allSupplies.filter(s => s.supplierId.toString() === id);
        setSupplies(supplierSupplies.sort((a, b) => b.id - a.id));

        // Load Payments
        const allPayments = JSON.parse(localStorage.getItem('supplier_payments') || '[]');
        const supplierPayments = allPayments.filter(p => p.supplierId.toString() === id);
        setPayments(supplierPayments.sort((a, b) => b.id - a.id));

        // Load open orders for linking (Only OPEN status AND not yet linked to any supply)
        const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        const allCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
        
        // ORPHAN PROTECTION: Find and remove orders that belong to non-existent customers
        const validOrders = allOrders.filter(order => {
            const customerExists = allCustomers.some(c => c.id?.toString() === order.customerId?.toString());
            return customerExists;
        });

        // If orphans were found, update the storage to clean up permanently
        if (validOrders.length !== allOrders.length) {
            localStorage.setItem('customer_orders', JSON.stringify(validOrders));
        }

        // Get IDs of all orders already linked to supplies
        const linkedOrderIds = allSupplies.map(s => s.linkedOrderId?.toString()).filter(Boolean);
        
        const linkable = validOrders.filter(o => 
            (o.status === 'OPEN' || o.status === 'IN_PRODUCTION') && 
            !linkedOrderIds.includes(o.id?.toString())
        );
        setOpenOrders(linkable);
    };

    const calculateTotalSuppliesValue = () => {
        return supplies.reduce((total, s) => safeMath.add(total, s.totalPrice), 0);
    };

    const calculateTotalPaid = () => {
        const paidFromSupplies = supplies.reduce((total, s) => safeMath.add(total, s.paidAmount || 0), 0);
        const paidFromPayments = payments.reduce((total, p) => safeMath.add(total, p.amount || 0), 0);
        return safeMath.add(paidFromSupplies, paidFromPayments);
    };

    const totalRemaining = safeMath.subtract(calculateTotalSuppliesValue(), calculateTotalPaid());

    // Handle adding a new supply
    const handleAddSupply = async () => {
        if (!newSupply.productName || !newSupply.quantity || !newSupply.unitPrice) {
            alert("يرجى ملء جميع الحقول المطلوبة للتوريدة");
            return;
        }

        const qty = parseFloat(newSupply.quantity);
        const price = parseFloat(newSupply.unitPrice);
        const paid = parseFloat(newSupply.paidAmount || 0);

        if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0 || isNaN(paid) || paid < 0) {
            alert("يرجى إدخال قيم رقمية صحيحة");
            return;
        }

        const totalPrice = safeMath.multiply(qty, price);
        const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');

        // Generate sequential supply number (e.g. SUP-101)
        const generateSupplyNumber = () => {
            const maxNum = allSupplies.reduce((max, s) => {
                const num = parseInt((s.supplyNumber || '').replace('SUP-', '')) || 0;
                return Math.max(max, num);
            }, 100);
            return `SUP-${maxNum + 1}`;
        };

        const supply = {
            id: Date.now(),
            supplyNumber: generateSupplyNumber(),
            supplierId: id,
            supplierName: supplier?.name || '',
            date: getCurrentDate().split('T')[0],
            productName: newSupply.productName,
            quantity: qty,
            unitPrice: price,
            totalPrice: totalPrice,
            paidAmount: paid,
            remainingAmount: safeMath.subtract(totalPrice, paid),
            remainingQuantity: qty,
            wasteQuantity: 0,
            // Order linking
            linkedOrderId: newSupply.linkedOrderId || null,
            linkedOrderNumber: newSupply.linkedOrderId
                ? openOrders.find(o => o.id.toString() === newSupply.linkedOrderId.toString())?.orderNumber || null
                : null,
            linkedCustomerName: newSupply.linkedOrderId
                ? openOrders.find(o => o.id.toString() === newSupply.linkedOrderId.toString())?.customerName || null
                : null,
            linkedCustomerId: newSupply.linkedOrderId
                ? openOrders.find(o => o.id.toString() === newSupply.linkedOrderId.toString())?.customerId || null
                : null,
        };

        allSupplies.push(supply);
        localStorage.setItem('supplier_supplies', JSON.stringify(allSupplies));

        // Auto-create Product in POS Catalog
        const productsData = JSON.parse(localStorage.getItem('products') || '[]');
        // We'll create a unique product per supply or update if same name exists
        // Here, creating a new product per supply is better for the Supply Link feature, 
        // but to avoid clutter we can also just create it with a unique ID matching the supply ID
        const newProduct = {
            id: `supply_${supply.id}`,
            name: newSupply.productName,
            price: price, // Base raw price
            costPrice: price, // For profit calc
            quantity: qty, // Prisma maps quantity back to stock in UI sometimes, wait, supabaseService expects 'stock' in addProduct
            stock: qty,
            minStock: 0,
            category: 'خامات توريد', // default category
            isSupplyProduct: true,
            supplyId: supply.id,
            supplierId: id,
            barcode: '',
            status: 'active'
        };

        try {
            await supabaseService.addProduct(newProduct);
        } catch (e) {
            console.error('Failed to sync new supply product to supabase', e);
        }

        productsData.push(newProduct);
        localStorage.setItem('products', JSON.stringify(productsData));
        publish(EVENTS.PRODUCTS_CHANGED, { type: 'add' });

        // Sync supply arrays to cloud setting
        try {
            await supabaseService.updateSetting('supplier_supplies', JSON.stringify(allSupplies));
        } catch (e) { console.error('Failed to sync supplies list to cloud', e); }

        // Update supplier global stats
        updateSupplierStats(id, totalPrice);

        soundManager.play('save');
        setShowSupplyModal(false);
        setNewSupply({ productName: '', quantity: '', unitPrice: '', paidAmount: '0', linkedOrderId: '' });
        loadData();
        // Auto print prompt for new supply
        setTimeout(() => {
            if (window.confirm('تم تسجيل التوريدة بنجاح! هل تود طباعة إيصال استلام للمورد الآن؟')) {
                handlePrintSupply(supply);
            }
        }, 600);
    };

    // Handle Printing Supply Receipt
    const handlePrintSupply = (supply) => {
        soundManager.play('openWindow');
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
            return;
        }

        const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
        const storeName = storeInfo.storeName || 'إلكينج';
        const storeLogo = storeInfo.logo || '';
        
        // Find existing linked order if any
        let linkedOrderText = supply.linkedOrderNumber ? `مرتبط بطلب: ${supply.linkedOrderNumber}` : '';

        const html = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>إيصال استلام توريدة - ${supply.supplyNumber}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
                    .header h1 { margin: 0; color: #5235E8; font-size: 24px; }
                    .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
                    .section { margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 8px; }
                    .section-title { font-weight: bold; background: #f8f9fa; padding: 5px 10px; border-right: 4px solid #5235E8; margin-bottom: 10px; margin-top: -15px; margin-right: -15px; width: fit-content; border-bottom-left-radius: 8px; }
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
                ${storeLogo ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${storeLogo}" style="max-height: 80px;" /></div>` : ''}
                <div class="header">
                    <h1>${storeName}</h1>
                    <p style="margin-top: 10px; font-weight: bold; font-size: 18px;">إيصال استلام بضاعة (توريدة)</p>
                    <p>رقم الإيصال: ${supply.supplyNumber}</p>
                </div>

                <div class="section">
                    <div class="section-title">بيانات المورد</div>
                    <div class="row"><span class="label">اسم المورد:</span><span class="value">${supplier?.name || '-'}</span></div>
                    <div class="row"><span class="label">تاريخ التوريد:</span><span class="value">${supply.date}</span></div>
                    <div class="row"><span class="label">الحالة التشغيلية:</span><span class="value">${linkedOrderText || 'توريد عام'}</span></div>
                </div>

                <div class="section">
                    <div class="section-title">تفاصيل المنتج والمواد الخام</div>
                    <div class="row"><span class="label">اسم المنتج المورد:</span><span class="value">${supply.productName}</span></div>
                    <div class="row"><span class="label">الكمية:</span><span class="value">${supply.quantity.toLocaleString()} كجم</span></div>
                    <div class="row"><span class="label">سعر الوحدة (الكيلو):</span><span class="value">${supply.unitPrice.toLocaleString()} ج.م</span></div>
                </div>

                <div class="section">
                    <div class="section-title">الحساب المالي للإيصال</div>
                    <div class="row"><span class="label">إجمالي قيمة التوريدة:</span><span class="value">${supply.totalPrice.toLocaleString()} ج.م</span></div>
                    <div class="row"><span class="label" style="color: green;">ما تم سداده في هذه العملية:</span><span class="value" style="color: green;">${supply.paidAmount.toLocaleString()} ج.م</span></div>
                    <div class="row"><span class="label" style="color: red;">المديونية المتبقية من هذه العملية:</span><span class="value" style="color: red;">${supply.remainingAmount.toLocaleString()} ج.م</span></div>
                </div>

                <div class="footer">
                    تم إصدار هذا الإيصال من نظام الإدارة الآلي <br>
                </div>
                <script>window.onload = function() { setTimeout(function(){ window.print(); }, 500); }</script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    // Handle adding a payment
    const handleAddPayment = async () => {
        if (!newPayment.amount) {
            alert("يرجى إدخال مبلغ الدفعة");
            return;
        }

        const amount = parseFloat(newPayment.amount);
        if (isNaN(amount) || amount <= 0) {
            alert("يرجى إدخال مبلغ صحيح");
            return;
        }

        if (totalRemaining <= 0) {
            alert("لا مديونية حالية لهذا المورد لسدادها.");
            return;
        }

        if (amount > totalRemaining) {
            alert(`المبلغ المدخل (${amount.toLocaleString()}) أكبر من إجمالي المديونية المتبقية (${totalRemaining.toLocaleString()}).`);
            return;
        }

        const payment = {
            id: Date.now(),
            supplierId: id,
            date: getCurrentDate().split('T')[0],
            amount: amount,
            paymentMethod: newPayment.paymentMethod,
            notes: newPayment.notes
        };

        const allPayments = JSON.parse(localStorage.getItem('supplier_payments') || '[]');
        allPayments.push(payment);
        localStorage.setItem('supplier_payments', JSON.stringify(allPayments));

        try {
            await supabaseService.updateSetting('supplier_payments', JSON.stringify(allPayments));
        } catch (e) { console.error('Failed to sync payments list to cloud', e); }

        publish(EVENTS.SUPPLIERS_CHANGED, { type: 'add_payment' });

        soundManager.play('save');
        setShowPaymentModal(false);
        setNewPayment({ amount: '', paymentMethod: 'نقدي', notes: '' });
        loadData();
    };

    const handleDeleteSupply = async (supplyId) => {
        if (window.confirm('هل أنت متأكد من حذف هذه التوريدة؟ سيتم أيضاً خصمها من الإجمالي.')) {
            const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
            const supplyToDelete = allSupplies.find(s => s.id === supplyId);

            if (supplyToDelete) {
                const filteredSupplies = allSupplies.filter(s => s.id !== supplyId);
                localStorage.setItem('supplier_supplies', JSON.stringify(filteredSupplies));

                try {
                    await supabaseService.updateSetting('supplier_supplies', JSON.stringify(filteredSupplies));
                } catch (e) { }

                // Remove linked product if exists
                const productsData = JSON.parse(localStorage.getItem('products') || '[]');
                const filteredProducts = productsData.filter(p => p.supplyId !== supplyId);
                localStorage.setItem('products', JSON.stringify(filteredProducts));

                try {
                    await supabaseService.deleteProduct(`supply_${supplyId}`);
                } catch (e) { console.error('Failed to delete supply product from supabase', e); }

                publish(EVENTS.PRODUCTS_CHANGED, { type: 'delete' });

                // Refill supplier stats (subtraction)
                updateSupplierStats(id, -supplyToDelete.totalPrice);

                soundManager.play('delete');
                loadData();
            }
        }
    };

    const handleDeletePayment = async (paymentId) => {
        if (window.confirm('هل أنت متأكد من حذف هذه الدفعة المالية؟')) {
            const allPayments = JSON.parse(localStorage.getItem('supplier_payments') || '[]');
            const filteredPayments = allPayments.filter(p => p.id !== paymentId);
            localStorage.setItem('supplier_payments', JSON.stringify(filteredPayments));

            try {
                await supabaseService.updateSetting('supplier_payments', JSON.stringify(filteredPayments));
            } catch (e) { }

            publish(EVENTS.SUPPLIERS_CHANGED, { type: 'delete_payment' });

            soundManager.play('delete');
            loadData();
        }
    };

    const updateSupplierStats = async (supplierId, additionalSpent) => {
        const suppliersData = JSON.parse(localStorage.getItem('suppliers') || '[]');
        const index = suppliersData.findIndex(s => s.id.toString() === supplierId);
        if (index !== -1) {
            const s = suppliersData[index];
            // If positive we add an order count (+1) and add to totalSpent, 
            // If negative we subtract an order count (-1) and subtract from totalSpent.
            s.totalSpent = Math.max(0, safeMath.add(s.totalSpent || 0, additionalSpent));
            if (additionalSpent > 0) {
                s.orders = (s.orders || 0) + 1;
            } else {
                s.orders = Math.max(0, (s.orders || 1) - 1);
            }
            suppliersData[index] = s;
            localStorage.setItem('suppliers', JSON.stringify(suppliersData));

            try {
                await supabaseService.updateSupplier(s.id, s);
            } catch (e) { console.error('Failed to update supplier stats to cloud', e); }

            // Update local state supplier and trigger event
            setSupplier(s);
            publish(EVENTS.SUPPLIERS_CHANGED, { type: 'update' });
        }
    };

    if (!supplier) {
        return (
            <div className="min-h-screen relative flex items-center justify-center pt-20">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3"></div>
                </div>
                <div className="text-slate-800 text-xl">جاري تحميل بيانات المورد... أو المورد غير موجود.</div>
            </div>
        );
    }

    // Calculated supply total inside new supply modal
    const newSupplyQty = parseFloat(newSupply.quantity) || 0;
    const newSupplyPrice = parseFloat(newSupply.unitPrice) || 0;
    const newSupplyTotal = safeMath.multiply(newSupplyQty, newSupplyPrice);
    const newSupplyPaid = parseFloat(newSupply.paidAmount) || 0;
    const newSupplyRemaining = safeMath.subtract(newSupplyTotal, newSupplyPaid);

    return (
        <div className="min-h-screen bg-[#F3F4F9] relative overflow-hidden pb-10">
            {/* Background Animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative z-10 p-4 md:p-6 lg:p-8 space-y-5">

                {/* Header Navigation */}
                <div className="flex items-center space-x-4 mb-2 rtl:space-x-reverse">
                    <button
                        onClick={() => navigate('/suppliers')}
                        className="flex items-center text-[#5235E8] hover:text-slate-800 transition-colors bg-white px-3 py-2 rounded-lg text-sm shadow-sm"
                    >
                        <ArrowRight className="h-4 w-4 ml-1" />
                        العودة للموردين
                    </button>
                </div>

                {/* Supplier Hero Card */}
                <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-[#5235E8] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            <User className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">{supplier.name}</h1>
                            <div className="flex flex-wrap items-center text-sm gap-3 font-medium">
                                <span className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                    <Phone className="h-3.5 w-3.5 ml-1" /> {supplier.phone}
                                </span>
                                {supplier.email && (
                                    <span className="flex items-center text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                                        <Mail className="h-3.5 w-3.5 ml-1" /> {supplier.email}
                                    </span>
                                )}
                                <span className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                    <Calendar className="h-3.5 w-3.5 ml-1" /> انضم: {supplier.joinDate}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end bg-white/50 p-4 rounded-2xl border border-white backdrop-blur-sm">
                        <p className="text-xs text-[#006af8] mb-1 font-bold">صافي المديونية الحالية</p>
                        <h2 className="text-3xl font-black text-red-600">
                            {totalRemaining <= 0 ? 0 : totalRemaining.toLocaleString()} ج.م
                        </h2>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5" style={{ animationDelay: '0.1s' }}>
                    <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                        <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
                        <p className="text-xs font-bold text-[#006af8] uppercase tracking-tight">إجمالي المديونية المتبقية</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-800 mt-1">{totalRemaining <= 0 ? 0 : totalRemaining.toLocaleString()} ج.م</h3>
                    </div>
                    <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                        <CreditCard className="h-10 w-10 text-emerald-500 mb-2" />
                        <p className="text-xs font-bold text-[#006af8] uppercase tracking-tight">إجمالي المدفوع للمورد</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-800 mt-1">{calculateTotalPaid().toLocaleString()} ج.م</h3>
                    </div>
                    <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-orange-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                        <Package className="h-10 w-10 text-orange-500 mb-2" />
                        <p className="text-xs font-bold text-[#006af8] uppercase tracking-tight">إجمالي عدد التوريدات</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-800 mt-1">{supplies.length}</h3>
                    </div>
                </div>

                {/* Action Buttons & Tabs Header */}
                <div className="flex flex-col md:flex-row justify-between items-center glass-card p-4" style={{ animationDelay: '0.2s' }}>
                    <div className="flex space-x-2 rtl:space-x-reverse mb-4 md:mb-0">
                        <button
                            onClick={() => setActiveTab('supplies')}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'supplies' ? 'bg-blue-600 text-slate-800' : 'text-blue-200 hover:bg-white hover:bg-opacity-10'}`}
                        >
                            سجل التوريدات
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'payments' ? 'bg-green-600 text-slate-800' : 'text-green-200 hover:bg-white hover:bg-opacity-10'}`}
                        >
                            سجل المدفوعات (السداد)
                        </button>
                    </div>
                    <div className="flex space-x-3 rtl:space-x-reverse">
                        <button
                            onClick={() => { soundManager.play('openWindow'); setShowSupplyModal(true); }}
                            className="btn-primary flex items-center px-4 py-2"
                        >
                            <Plus className="h-5 w-5 ml-2" />
                            إضافة توريدة
                        </button>
                        <button
                            onClick={() => {
                                if (totalRemaining <= 0) {
                                    alert('لا توجد مديونية مستحقة لهذا المورد لسدادها.');
                                    return;
                                }
                                soundManager.play('openWindow');
                                setShowPaymentModal(true);
                            }}
                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-slate-800 flex items-center px-4 py-2 rounded-lg font-bold shadow-lg"
                        >
                            <CreditCard className="h-5 w-5 ml-2" />
                            سداد دفعة
                        </button>
                    </div>
                </div>

                {/* Content area based on active tab */}
                <div className="" style={{ animationDelay: '0.3s' }}>
                    {activeTab === 'supplies' && (
                        <div className="glass-card overflow-hidden table-enhanced">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#F3F4F9] border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase">رقم التوريدة</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">التاريخ</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">المنتج</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الكمية</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">السعر / الوحدة</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الإجمالي</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">المدفوع</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">المتبقي</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الهالك</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">مرتبط بطلب</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">إجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {supplies.map(supply => (
                                            <tr key={supply.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-right">
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-xs font-mono font-bold text-[#5235E8] bg-[#5235E8]/10 px-2 py-1 rounded">
                                                        {supply.supplyNumber || `#${supply.id.toString().slice(-4)}`}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-[#006af8] font-medium text-right">{supply.date}</td>
                                                <td className="px-4 py-4 text-sm font-bold text-slate-800 text-right">{supply.productName}</td>
                                                <td className="px-4 py-4 text-sm text-[#ff8200] font-bold text-right">{supply.quantity.toLocaleString()} كجم</td>
                                                <td className="px-4 py-4 text-sm text-slate-600 text-right">{supply.unitPrice.toLocaleString()} ج.م</td>
                                                <td className="px-4 py-4 text-sm font-bold text-slate-900 text-right">
                                                    <span className="bg-slate-100 px-2 py-1 rounded-md bg-opacity-50">
                                                        {supply.totalPrice.toLocaleString()} ج.م
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-emerald-600 font-bold text-right">{supply.paidAmount.toLocaleString()} ج.م</td>
                                                <td className="px-4 py-4 text-sm text-red-600 font-bold text-right">{supply.remainingAmount.toLocaleString()} ج.م</td>
                                                <td className="px-4 py-4 text-sm font-bold text-red-500 text-right">
                                                    <span className="bg-red-50 px-2 py-1 rounded">
                                                        {supply.wasteQuantity || 0} كجم
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-right">
                                                    {supply.linkedOrderNumber ? (
                                                        <div className="flex flex-col gap-0.5 items-end">
                                                            <span className="text-[#8410ff] font-bold text-xs bg-[#8410ff]/10 px-2.5 py-1 rounded-full">{supply.linkedOrderNumber}</span>
                                                            <span className="text-[#006af8] text-xs px-1 font-medium">
                                                                {supabaseService.getCustomerName(supply.linkedCustomerId) || supply.linkedCustomerName}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs italic">غير مرتبط</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-right text-left">
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => handlePrintSupply(supply)}
                                                            className="text-indigo-500 hover:text-indigo-400 hover:bg-indigo-500 hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                                                            title="طباعة إيصال التوريدة"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSupply(supply.id)}
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-500 hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                                                            title="حذف التوريدة"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {supplies.length === 0 && (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-8 text-center text-[#006af8]">لا توجد توريدات مسجلة لهذا المورد بعد.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="glass-card overflow-hidden table-enhanced">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-gray-800 to-gray-900">
                                        <tr>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">رقم العملية</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">التاريخ</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-green-300 uppercase tracking-wider">المبلغ المسدد</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-blue-300 uppercase tracking-wider">طريقة الدفع</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-purple-300 uppercase tracking-wider">ملاحظات</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">إجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white divide-opacity-20">
                                        {payments.map(payment => (
                                            <tr key={payment.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-right">
                                                <td className="px-6 py-4 text-sm text-[#006af8] text-right whitespace-nowrap">#{payment.id.toString().slice(-6)}</td>
                                                <td className="px-6 py-4 text-sm text-slate-700 text-right whitespace-nowrap">{payment.date}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right whitespace-nowrap">
                                                    <span className="bg-emerald-50 px-2 py-1 rounded">
                                                        {payment.amount.toLocaleString()} ج.م
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                                                    <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-bold">
                                                        {payment.paymentMethod}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 text-right">{payment.notes || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-right text-left">
                                                    <button
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500 hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                                                        title="حذف الدفعة"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {payments.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-[#006af8]">لا توجد دفعات مالية مسجلة مسبقاً لهذا المورد.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Add Supply Modal */}
            {showSupplyModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg mx-4 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Package className="h-6 w-6 text-[#5235E8]" />
                                إضافة توريدة جديدة
                            </h2>
                            <button
                                onClick={() => { soundManager.play('closeWindow'); setShowSupplyModal(false); }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">اسم المنتج الخامه</label>
                                <input
                                    type="text"
                                    placeholder="مثال: حبيبات بولي إيثيلين"
                                    value={newSupply.productName}
                                    onChange={(e) => setNewSupply({ ...newSupply, productName: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] focus:ring-2 focus:ring-[#5235E8]/20 outline-none transition-all text-right"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">الكمية (كجم)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0.00"
                                        value={newSupply.quantity}
                                        onChange={(e) => setNewSupply({ ...newSupply, quantity: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] focus:ring-2 focus:ring-[#5235E8]/20 outline-none transition-all text-right font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">سعر الكيلو</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0.00"
                                        value={newSupply.unitPrice}
                                        onChange={(e) => setNewSupply({ ...newSupply, unitPrice: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] focus:ring-2 focus:ring-[#5235E8]/20 outline-none transition-all text-right font-bold"
                                    />
                                </div>
                            </div>

                            <div className="bg-[#5235E8]/5 p-4 rounded-2xl border border-[#5235E8]/10 flex justify-between items-center">
                                <span className="text-slate-600 font-bold">إجمالي التكلفة:</span>
                                <span className="text-2xl font-black text-[#5235E8]">{newSupplyTotal.toLocaleString()} ج.م</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">المبلغ المدفوع</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0.00"
                                        value={newSupply.paidAmount}
                                        onChange={(e) => setNewSupply({ ...newSupply, paidAmount: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-right text-emerald-600 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">المتبقي مديونية</label>
                                    <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-right border border-red-100">
                                        {newSupplyRemaining.toLocaleString()} ج.م
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-[#8410ff]" />
                                    ربط بطلب عميل (اختياري)
                                </label>
                                <select
                                    value={newSupply.linkedOrderId}
                                    onChange={(e) => {
                                        const order = openOrders.find(o => o.id.toString() === e.target.value);
                                        setNewSupply({
                                            ...newSupply,
                                            linkedOrderId: e.target.value,
                                            linkedOrderNumber: order?.orderNumber || '',
                                            linkedCustomerName: order?.customerName || '',
                                            linkedCustomerId: order?.customerId || ''
                                        });
                                    }}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] outline-none transition-all text-right appearance-none bg-white font-medium"
                                >
                                    <option value="">-- اختر طلب للربط --</option>
                                    {openOrders.map(order => {
                                        const currentName = supabaseService.getCustomerName(order.customerId) || order.customerName || 'عميل غير معروف';
                                        return (
                                            <option key={order.id} value={order.id}>
                                                {order.orderNumber} - {currentName} ({order.quantity?.toLocaleString()} {order.productType})
                                            </option>
                                        );
                                    })}
                                </select>
                                {openOrders.length === 0 && (
                                    <p className="text-xs text-slate-400 mt-2 italic text-center">لا توجد طلبات مفتوحة حالياً للربط.</p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => { soundManager.play('closeWindow'); setShowSupplyModal(false); }}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleAddSupply}
                                    className="flex-[2] px-4 py-3 rounded-xl bg-[#5235E8] text-white font-bold hover:bg-[#4329c3] shadow-lg shadow-[#5235E8]/20 transition-all"
                                >
                                    حفظ التوريدة
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <CreditCard className="h-6 w-6 text-emerald-500" />
                                سداد دفعة مالية للمورد
                            </h2>
                            <button
                                onClick={() => { soundManager.play('closeWindow'); setShowPaymentModal(false); }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6 flex justify-between items-center">
                            <span className="text-slate-600 font-bold">المديونية الحالية:</span>
                            <span className="text-xl font-black text-red-600">${totalRemaining.toLocaleString()}</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">المبلغ المسدد</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="0.00"
                                    value={newPayment.amount}
                                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                    className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-right font-black text-2xl text-emerald-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">طريقة الدفع</label>
                                <select
                                    value={newPayment.paymentMethod}
                                    onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] outline-none transition-all text-right appearance-none bg-white font-medium"
                                >
                                    <option value="نقدي">💵 نقدي</option>
                                    <option value="تحويل بنكي">🏦 تحويل بنكي</option>
                                    <option value="شيك">📝 شيك</option>
                                    <option value="محفظة إلكترونية">📱 محفظة إلكترونية</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات (اختياري)</label>
                                <textarea
                                    value={newPayment.notes}
                                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                                    rows="3"
                                    placeholder="اكتب أي ملاحظات متعلقة بالسداد هنا..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] outline-none transition-all text-right"
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => { soundManager.play('closeWindow'); setShowPaymentModal(false); }}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleAddPayment}
                                className="flex-[2] px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                            >
                                تأكيد السداد
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SupplierDetails;
