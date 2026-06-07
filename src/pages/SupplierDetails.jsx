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
    Edit,
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
import { printHtmlContent } from '../utils/printHelper.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import supabaseService from '../utils/supabaseService';
import toast from 'react-hot-toast';

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

    const [editingSupply, setEditingSupply] = useState(null);

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

    const loadData = React.useCallback(async () => {
        // Load Supplier Data
        try {
            const suppliersData = JSON.parse(localStorage.getItem('suppliers') || '[]');
            const currentSupplier = suppliersData.find(s => s.id.toString() === id);
            if (currentSupplier) {
                setSupplier(currentSupplier);
            }
        } catch (e) { }

        // Load Supplies from Supabase
        try {
            const cloudSupplies = await supabaseService.getSupplierSupplies(id);
            if (cloudSupplies && cloudSupplies.length > 0) {
                setSupplies(cloudSupplies.sort((a, b) => b.id - a.id));
                // Update local storage
                const allLocal = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
                const otherSupplies = allLocal.filter(s => s.supplierId?.toString() !== id.toString());
                localStorage.setItem('supplier_supplies', JSON.stringify([...otherSupplies, ...cloudSupplies]));
            } else {
                const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
                const supplierSupplies = allSupplies.filter(s => s.supplierId?.toString() === id.toString());
                setSupplies(supplierSupplies.sort((a, b) => b.id - a.id));
            }
        } catch (e) {
            const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
            const supplierSupplies = allSupplies.filter(s => s.supplierId?.toString() === id.toString());
            setSupplies(supplierSupplies.sort((a, b) => b.id - a.id));
        }

        // Load Payments - always merge cloud + local to avoid data loss
        try {
            const cloudPayments = await supabaseService.getSupplierPayments(id);
            const allLocal = JSON.parse(localStorage.getItem('supplier_payments') || '[]');
            const localForThisSupplier = allLocal.filter(p => p.supplierId?.toString() === id.toString());
            
            if (cloudPayments && cloudPayments.length > 0) {
                // Merge: start with local, override with cloud, keep local-only entries
                const merged = localForThisSupplier.map(lp => {
                    const cp = cloudPayments.find(c => c.id?.toString() === lp.id?.toString());
                    return cp ? { ...lp, ...cp } : lp;
                });
                // Add cloud-only entries not in local
                cloudPayments.forEach(cp => {
                    if (!merged.find(m => m.id?.toString() === cp.id?.toString())) {
                        merged.push(cp);
                    }
                });
                const sorted = merged.sort((a, b) => b.id - a.id);
                setPayments(sorted);
                // Update localStorage with merged result
                const otherPayments = allLocal.filter(p => p.supplierId?.toString() !== id.toString());
                localStorage.setItem('supplier_payments', JSON.stringify([...otherPayments, ...sorted]));
            } else {
                // No cloud data - use local only
                setPayments(localForThisSupplier.sort((a, b) => b.id - a.id));
            }
        } catch (e) {
            const allPayments = JSON.parse(localStorage.getItem('supplier_payments') || '[]');
            const supplierPayments = allPayments.filter(p => p.supplierId?.toString() === id.toString());
            setPayments(supplierPayments.sort((a, b) => b.id - a.id));
        }

        // Load open orders for linking
        const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        const allCustomers = JSON.parse(localStorage.getItem('customers') || '[]');

        const validOrders = allOrders.filter(order => {
            const customerExists = allCustomers.some(c => c.id?.toString() === order.customerId?.toString());
            return customerExists;
        });

        const allSuppliesForLink = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
        const linkedOrderIds = allSuppliesForLink.map(s => s.linkedOrderId?.toString()).filter(Boolean);

        const linkable = validOrders.filter(o =>
            (o.status === 'OPEN' || o.status === 'IN_PRODUCTION') &&
            !linkedOrderIds.includes(o.id?.toString())
        );
        setOpenOrders(linkable);
    }, [id]);

    const calculateTotalSuppliesValue = () => {
        return supplies.reduce((total, s) => safeMath.add(total, s.totalPrice), 0);
    };

    const calculateTotalPaid = () => {
        const paidFromSupplies = supplies.reduce((total, s) => safeMath.add(total, s.paidAmount || 0), 0);
        const paidFromPayments = payments.reduce((total, p) => safeMath.add(total, p.amount || 0), 0);
        return safeMath.add(paidFromSupplies, paidFromPayments);
    };

    const totalRemaining = safeMath.subtract(calculateTotalSuppliesValue(), calculateTotalPaid());

    // Handle adding or updating a supply
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

        if (editingSupply) {
            // UPDATE LOGIC
            const oldPrice = editingSupply.totalPrice;
            const diff = safeMath.subtract(totalPrice, oldPrice);

            const updatedSupply = {
                ...editingSupply,
                productName: newSupply.productName,
                quantity: qty,
                unitPrice: price,
                totalPrice: totalPrice,
                paidAmount: paid,
                remainingAmount: safeMath.subtract(totalPrice, paid),
                // Note: we reset remainingQuantity to new qty for simplicity in raw material management
                remainingQuantity: qty, 
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

            const updatedAllSupplies = allSupplies.map(s => s.id === editingSupply.id ? updatedSupply : s);
            localStorage.setItem('supplier_supplies', JSON.stringify(updatedAllSupplies));

            // Sync to Cloud
            try {
                await supabaseService.updateSupplierSupply(editingSupply.id, updatedSupply);
            } catch (e) { console.error('Failed to sync updated supply to cloud', e); }

            // Update associated Product
            const productsData = JSON.parse(localStorage.getItem('products') || '[]');
            const productIndex = productsData.findIndex(p => p.supplyId === editingSupply.id);
            if (productIndex !== -1) {
                productsData[productIndex] = {
                    ...productsData[productIndex],
                    name: updatedSupply.productName,
                    price: price,
                    costPrice: price,
                    stock: qty
                };
                localStorage.setItem('products', JSON.stringify(productsData));
                try {
                    await supabaseService.updateProduct(`supply_${editingSupply.id}`, productsData[productIndex]);
                } catch (e) { }
            }

            // Update supplier stats with DIFF
            if (diff !== 0) {
                updateSupplierStats(id, diff, false); 
            }

            toast.success('تم تحديث التوريدة بنجاح');
            setEditingSupply(null);
        } else {
            // CREATE LOGIC
            const generateSupplyNumber = () => {
                const maxNum = allSupplies.reduce((max, s) => {
                    const num = parseInt((s.supplyNumber || '').replace('SUP-', '')) || 0;
                    return Math.max(max, num);
                }, 100);
                return `SUP-${maxNum + 1}`;
            };

            const activeShiftForSupply = JSON.parse(localStorage.getItem('activeShift') || 'null');
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
                shiftId: activeShiftForSupply?.id || null,
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
            const newProduct = {
                id: `supply_${supply.id}`,
                name: newSupply.productName,
                price: price,
                costPrice: price,
                stock: qty,
                minStock: 0,
                category: 'خامات توريد',
                supplyId: supply.id,
                isSupplyProduct: true,
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

            // Sync supply to dedicated table
            try {
                await supabaseService.addSupplierSupply(supply);
            } catch (e) { console.error('Failed to sync supply to cloud', e); }

            // Update supplier global stats
            updateSupplierStats(id, totalPrice, true);
            toast.success('تم إضافة التوريدة بنجاح');

            // Auto print prompt for new supply
            setTimeout(() => {
                if (window.confirm('تم تسجيل التوريدة بنجاح! هل تود طباعة إيصال استلام للمورد الآن؟')) {
                    handlePrintSupply(supply);
                }
            }, 600);
        }

        soundManager.play('save');
        setShowSupplyModal(false);
        setNewSupply({ productName: '', quantity: '', unitPrice: '', paidAmount: '0', linkedOrderId: '' });
        loadData();
    };

    // Handle Printing Supply Receipt
    const handlePrintSupply = (supply) => {
        soundManager.play('openWindow');

        const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
        const storeName = storeInfo.storeName || 'Ms Group Factory';
        const storePhone = storeInfo.storePhone || storeInfo.phone || '01029022006-01102364000-01025171668';
        const storeAddress = storeInfo.storeAddress || storeInfo.address || 'عزبة رستم\nبجوار هايبر مصر\nشارع عرفة الدسوقي';
        const storeLogo = storeInfo.logo || '';
        const storeEmail = storeInfo.storeEmail || 'info@msgroupplast.com';
        const storeTaxNumber = storeInfo.storeTaxNumber || '769337252';
        const storeDescription = storeInfo.storeDescription || 'لاستيراد وتصدير وتصنيع المواد البلاستيكية والتعبئة والتغليف';

        // Find existing linked order if any
        let linkedOrderText = supply.linkedOrderNumber ? `مرتبط بطلب: ${supply.linkedOrderNumber}` : '';

        const html = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>إيصال استلام توريدة - ${supply.supplyNumber}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 28px; color: #1a1a2e; line-height: 1.6; background: #f8f9fe; }
                    /* ====== HEADER ====== */
                    .invoice-header { background: linear-gradient(135deg, #5235E8 0%, #7C3AED 100%); border-radius: 16px; padding: 28px 32px 22px; margin-bottom: 24px; color: #fff; position: relative; overflow: hidden; }
                    .invoice-header::before { content: ''; position: absolute; top: -40px; left: -40px; width: 160px; height: 160px; background: rgba(255,255,255,0.07); border-radius: 50%; }
                    .invoice-header::after  { content: ''; position: absolute; bottom: -50px; right: -30px; width: 200px; height: 200px; background: rgba(255,255,255,0.05); border-radius: 50%; }
                    .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; position: relative; z-index: 1; }
                    .company-name { font-size: 26px; font-weight: 900; letter-spacing: 0.5px; }
                    .company-desc { font-size: 12px; opacity: 0.82; margin-top: 4px; }
                    .invoice-badge { background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.4); color: #fff; padding: 6px 20px; border-radius: 50px; font-size: 13px; font-weight: 700; backdrop-filter: blur(4px); white-space: nowrap; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; position: relative; z-index: 1; }
                    .info-card { background: rgba(255,255,255,0.13); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 10px 14px; min-height: 76px; display: flex; flex-direction: column; justify-content: flex-start; }
                    .info-card .lbl { font-size: 10px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
                    .info-card .val { font-size: 12px; font-weight: 700; white-space: pre-line; line-height: 1.7; word-break: break-word; }
                    .order-strip { background: #fff; border-radius: 12px; padding: 14px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 12px rgba(82,53,232,0.10); border-right: 5px solid #5235E8; }
                    .order-strip .ord-label { font-size: 13px; color: #6b7280; }
                    .order-strip .ord-value { font-size: 20px; font-weight: 900; color: #5235E8; }
                    .order-strip .ord-badge { background: #eef2ff; color: #5235E8; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
                    /* ====== SECTIONS ====== */
                    .section { margin-bottom: 18px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }
                    .section-title { font-weight: 700; background: linear-gradient(90deg, #5235E8, #7C3AED); color: #fff; padding: 9px 16px; font-size: 13px; letter-spacing: 0.5px; }
                    .row { display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding: 8px 16px; align-items: center; }
                    .row:last-child { border-bottom: none; }
                    .label { color: #6b7280; font-size: 12.5px; }
                    .value { font-weight: 700; font-size: 13px; color: #111827; }
                    /* ====== TOTALS ====== */
                    .totals { margin-top: 20px; background: linear-gradient(135deg, #eef2ff, #f5f3ff); border: 2px solid #5235E8; border-radius: 14px; padding: 16px 20px; }
                    .grand-total { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #c4b5fd; }
                    .grand-total .label { font-size: 15px; font-weight: 700; color: #5235E8; }
                    .grand-total .value { font-size: 22px; font-weight: 900; color: #5235E8; }
                    .paid-row { display: flex; justify-content: space-between; padding: 6px 0; }
                    .paid-row .label { font-size: 13px; color: #15803d; font-weight: 600; }
                    .paid-row .value { font-size: 14px; font-weight: 900; color: #15803d; }
                    .remaining-row { display: flex; justify-content: space-between; padding: 6px 0; }
                    .remaining-row .label { font-size: 13px; color: #dc2626; font-weight: 600; }
                    .remaining-row .value { font-size: 14px; font-weight: 900; color: #dc2626; }
                    /* ====== FOOTER ====== */
                    .footer { text-align: center; margin-top: 28px; font-size: 11px; color: #9ca3af; border-top: 1px dashed #e5e7eb; padding-top: 14px; }
                    @media print {
                        @page { margin: 0; }
                        body { padding: 1.2cm; background: #fff; }
                        button { display: none !important; }
                    }
                </style>
            </head>
            <body>
                ${storeLogo ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${storeLogo}" style="max-height: 80px; max-width: 100%; object-fit: contain;" /></div>` : ''}

                <!-- ===== HEADER ===== -->
                <div class="invoice-header">
                    <div class="header-top">
                        <div>
                            <div class="company-name">${storeName}</div>
                            <div class="company-desc">${storeDescription}</div>
                        </div>
                        <span class="invoice-badge">• إيصال استلام بضاعة •</span>
                    </div>
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="lbl">📍 العنوان</div>
                            <div class="val">${storeAddress.replace(/-/g,'\n')}</div>
                        </div>
                        <div class="info-card">
                            <div class="lbl">📞 التواصل</div>
                            <div class="val">${storePhone.replace(/-/g,'\n')}</div>
                            <div class="val" style="font-weight:500; font-size:11px; margin-top:4px; opacity:.85;">${storeEmail}</div>
                        </div>
                        <div class="info-card">
                            <div class="lbl">🏦 الرقم الضريبي</div>
                            <div class="val">${storeTaxNumber}</div>
                        </div>
                    </div>
                </div>

                <!-- ===== RECEIPT NUMBER STRIP ===== -->
                <div class="order-strip">
                    <div>
                        <div class="ord-label">رقم الإيصال</div>
                        <div class="ord-value">${supply.supplyNumber}</div>
                    </div>
                    <span class="ord-badge">إيصال توريدة</span>
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
                    <div class="row"><span class="label">الكمية:</span><span class="value">${Number(supply.quantity).toLocaleString()} كجم</span></div>
                    <div class="row"><span class="label">سعر الكيلو:</span><span class="value">${Number(supply.unitPrice).toLocaleString()} ج.م</span></div>
                </div>

                <div class="totals">
                    <div class="grand-total">
                        <span class="label">إجمالي قيمة التوريدة:</span>
                        <span class="value">${Number(supply.totalPrice).toLocaleString()} ج.م</span>
                    </div>
                    <div class="paid-row">
                        <span class="label">المبلغ المسدد في هذه العملية:</span>
                        <span class="value">${Number(supply.paidAmount).toLocaleString()} ج.م</span>
                    </div>
                    <div class="remaining-row">
                        <span class="label">المديونية المتبقية من هذه العملية:</span>
                        <span class="value">${Number(supply.remainingAmount).toLocaleString()} ج.م</span>
                    </div>
                </div>

                <div class="footer">
                    ${storeName} &mdash; نظام إدارة الفواتير والتوريدات
                </div>
            </body>
            </html>
        `;

        printHtmlContent(html);
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

        const activeShiftForSupplierPayment = JSON.parse(localStorage.getItem('activeShift') || 'null');
        const payment = {
            id: Date.now(),
            supplierId: id,
            date: getCurrentDate().split('T')[0],
            amount: amount,
            paymentMethod: newPayment.paymentMethod,
            shiftId: activeShiftForSupplierPayment?.id || null,
            notes: newPayment.notes
        };

        const allPayments = JSON.parse(localStorage.getItem('supplier_payments') || '[]');
        allPayments.push(payment);
        localStorage.setItem('supplier_payments', JSON.stringify(allPayments));

        try {
            await supabaseService.addSupplierPayment(payment);
        } catch (e) { console.error('Failed to sync payment to cloud', e); }

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
                    await supabaseService.deleteSupplierSupply(supplyId);
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
                updateSupplierStats(id, -supplyToDelete.totalPrice, true);

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
                await supabaseService.deleteSupplierPayment(paymentId);
            } catch (e) { }

            publish(EVENTS.SUPPLIERS_CHANGED, { type: 'delete_payment' });

            soundManager.play('delete');
            loadData();
        }
    };

    const updateSupplierStats = async (supplierId, additionalSpent, shouldChangeOrderCount = true) => {
        const suppliersData = JSON.parse(localStorage.getItem('suppliers') || '[]');
        const index = suppliersData.findIndex(s => s.id.toString() === supplierId);
        if (index !== -1) {
            const s = suppliersData[index];
            s.totalSpent = Math.max(0, safeMath.add(s.totalSpent || 0, additionalSpent));
            
            if (shouldChangeOrderCount) {
                if (additionalSpent > 0) {
                    s.orders = (s.orders || 0) + 1;
                } else {
                    s.orders = Math.max(0, (s.orders || 1) - 1);
                }
            }
            
            suppliersData[index] = s;
            localStorage.setItem('suppliers', JSON.stringify(suppliersData));

            try {
                await supabaseService.updateSupplier(s.id, s);
            } catch (e) { console.error('Failed to update supplier stats to cloud', e); }

            setSupplier(s);
            publish(EVENTS.SUPPLIERS_CHANGED, { type: 'update' });
        }
    };

    const handleEditSupply = (supply) => {
        setEditingSupply(supply);
        setNewSupply({
            productName: supply.productName,
            quantity: supply.quantity.toString(),
            unitPrice: supply.unitPrice.toString(),
            paidAmount: (supply.paidAmount || 0).toString(),
            linkedOrderId: supply.linkedOrderId ? supply.linkedOrderId.toString() : ''
        });
        setShowSupplyModal(true);
        soundManager.play('openWindow');
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" style={{ animationDelay: '0.1s' }}>
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
                        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                        <Package className="h-10 w-10 text-[#006af8] mb-2" />
                        <p className="text-xs font-bold text-[#006af8] uppercase tracking-tight">إجمالي الكمية (كجم)</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-800 mt-1">{supplies.reduce((total, s) => total + (parseFloat(s.quantity) || 0), 0).toLocaleString()} كجم</h3>
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
                            onClick={() => { 
                                setEditingSupply(null);
                                setNewSupply({ productName: '', quantity: '', unitPrice: '', paidAmount: '0', linkedOrderId: '' });
                                setShowSupplyModal(true); 
                                soundManager.play('openWindow'); 
                            }}
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
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الكمية (الأساسية)</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الصافي المسلم</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الهالك</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">السعر / الوحدة</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">الإجمالي</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">المدفوع</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">المتبقي</th>
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
                                                <td className="px-4 py-4 text-sm font-bold text-emerald-600 text-right">
                                                    <span className="bg-emerald-50 border border-emerald-100 px-2 py-1 rounded">
                                                        {supply.netDeliveredQuantity ? `${supply.netDeliveredQuantity.toLocaleString()} كجم` : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm font-bold text-red-500 text-right">
                                                    <span className="bg-red-50 border border-red-100 px-2 py-1 rounded">
                                                        {supply.wasteQuantity || 0} كجم
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-slate-600 text-right">{supply.unitPrice.toLocaleString()} ج.م</td>
                                                <td className="px-4 py-4 text-sm font-bold text-slate-900 text-right">
                                                    <span className="bg-slate-100 px-2 py-1 rounded-md bg-opacity-50">
                                                        {supply.totalPrice.toLocaleString()} ج.م
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-emerald-600 font-bold text-right">{supply.paidAmount.toLocaleString()} ج.م</td>
                                                <td className="px-4 py-4 text-sm text-red-600 font-bold text-right">{supply.remainingAmount.toLocaleString()} ج.م</td>
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
                                                            onClick={() => handleEditSupply(supply)}
                                                            className="text-blue-500 hover:text-blue-400 hover:bg-blue-500 hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                                                            title="تعديل التوريدة"
                                                        >
                                                            <Edit className="h-4 w-4" />
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
                                {editingSupply ? `تعديل توريدة: ${editingSupply.supplyNumber}` : 'إضافة توريدة جديدة'}
                            </h2>
                            <button
                                onClick={() => { soundManager.play('closeWindow'); setShowSupplyModal(false); setEditingSupply(null); }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {editingSupply && (
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-700 text-xs font-bold mb-4 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                تنبيه: تعديل التوريدة سيؤثر على مديونية المورد وتكلفة المنتج المرتبط.
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">اسم المنتج الخامه</label>
                                <input
                                    type="text"
                                    placeholder="مثال: حبيبات بولي إيثيلين"
                                    value={newSupply.productName}
                                    onChange={(e) => setNewSupply({ ...newSupply, productName: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] focus:ring-2 focus:ring-[#5235E8]/20 outline-none transition-all text-right text-slate-900 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">الكمية (كجم)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        dir="ltr"
                                        value={newSupply.quantity}
                                        onChange={(e) => setNewSupply({ ...newSupply, quantity: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] focus:ring-2 focus:ring-[#5235E8]/20 outline-none transition-all text-right font-bold text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">سعر الكيلو</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        dir="ltr"
                                        value={newSupply.unitPrice}
                                        onChange={(e) => setNewSupply({ ...newSupply, unitPrice: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] focus:ring-2 focus:ring-[#5235E8]/20 outline-none transition-all text-right font-bold text-slate-900"
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
                                        step="any"
                                        placeholder="0.00"
                                        dir="ltr"
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
                                            productName: order?.productType || newSupply.productName,
                                            quantity: order?.quantity ? order.quantity.toString() : newSupply.quantity,
                                            linkedOrderId: e.target.value,
                                            linkedOrderNumber: order?.orderNumber || '',
                                            linkedCustomerName: order?.customerName || '',
                                            linkedCustomerId: order?.customerId || ''
                                        });
                                    }}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] outline-none transition-all text-right appearance-none bg-white font-medium text-slate-900"
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
                                    onClick={() => { soundManager.play('closeWindow'); setShowSupplyModal(false); setEditingSupply(null); }}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleAddSupply}
                                    className="flex-[2] px-4 py-3 rounded-xl bg-[#5235E8] text-white font-bold hover:bg-[#4329c3] shadow-lg shadow-[#5235E8]/20 transition-all"
                                >
                                    {editingSupply ? 'حفظ التعديلات' : 'إضافة التوريدة'}
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
                                    step="any"
                                    placeholder="0.00"
                                    dir="ltr"
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
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] outline-none transition-all text-right appearance-none bg-white font-medium text-slate-900"
                                >
                                    <option className="text-slate-900" value="نقدي">💵 نقدي</option>
                                    <option className="text-slate-900" value="تحويل بنكي">🏦 تحويل بنكي</option>
                                    <option className="text-slate-900" value="شيك">📝 شيك</option>
                                    <option className="text-slate-900" value="محفظة إلكترونية">📱 محفظة إلكترونية</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات (اختياري)</label>
                                <textarea
                                    value={newPayment.notes}
                                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                                    rows="3"
                                    placeholder="اكتب أي ملاحظات متعلقة بالسداد هنا..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#5235E8] outline-none transition-all text-right text-slate-900 font-medium"
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
