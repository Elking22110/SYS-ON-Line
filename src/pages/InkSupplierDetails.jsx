import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Save, X, Droplets, DollarSign, ArrowRight, Package, Layers, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import soundManager from '../utils/soundManager.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import supabaseService from '../utils/supabaseService.js';
import { observerManager } from '../utils/observerManager.js';
import { printHtmlContent } from '../utils/printHelper.js';

const INK_SUPPLIERS_KEY = 'ink_suppliers';
const INK_SUPPLIES_KEY = 'ink_supplies';
const INK_PAYMENTS_KEY = 'ink_payments';
const emptyColor = () => ({ id: Date.now() + Math.random(), color: '', quantity: '', cost: '' });

const InkSupplierDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [supplyColors, setSupplyColors] = useState([emptyColor()]);
  const [supplyDate, setSupplyDate] = useState(getCurrentDate().split('T')[0]);
  const [supplyPaid, setSupplyPaid] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [expandedSupply, setExpandedSupply] = useState(null);

  const load = () => {
    const all = JSON.parse(localStorage.getItem(INK_SUPPLIERS_KEY) || '[]');
    const found = all.find(s => s.id === id);
    setSupplier(found || null);
    const allSup = JSON.parse(localStorage.getItem(INK_SUPPLIES_KEY) || '[]');
    setSupplies(allSup.filter(s => s.supplierId === id).sort((a, b) => b.id - a.id));
    const allPay = JSON.parse(localStorage.getItem(INK_PAYMENTS_KEY) || '[]');
    setPayments(allPay.filter(p => p.supplierId === id).sort((a, b) => b.id - a.id));
  };

  useEffect(() => { 
    load(); 
    const unsubSuppliers = observerManager.subscribe('ink_suppliers_changed', load);
    const unsubSupplies = observerManager.subscribe('ink_supplies_changed', load);
    const unsubPayments = observerManager.subscribe('ink_payments_changed', load);
    return () => { unsubSuppliers(); unsubSupplies(); unsubPayments(); };
  }, [id]);

  const totalSupply = (colors) => colors.reduce((s, c) => {
    const total = safeMath.multiply(parseFloat(c.cost) || 0, parseFloat(c.quantity) || 0);
    return safeMath.add(s, total);
  }, 0);

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

    const colors = supply.colors || supply.metadata?.colors || [];

    const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>إيصال استلام أحبار - ${supply.supplyNumber}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 28px; color: #1a1a2e; line-height: 1.6; background: #f8f9fe; }
                /* ====== HEADER ====== */
                .invoice-header { background: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%); border-radius: 16px; padding: 28px 32px 22px; margin-bottom: 24px; color: #fff; position: relative; overflow: hidden; }
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
                .order-strip { background: #fff; border-radius: 12px; padding: 14px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 12px rgba(6,182,212,0.10); border-right: 5px solid #06B6D4; }
                .order-strip .ord-label { font-size: 13px; color: #6b7280; }
                .order-strip .ord-value { font-size: 20px; font-weight: 900; color: #06B6D4; }
                .order-strip .ord-badge { background: #ecfeff; color: #0891b2; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
                /* ====== SECTIONS ====== */
                .section { margin-bottom: 18px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }
                .section-title { font-weight: 700; background: linear-gradient(90deg, #06B6D4, #3B82F6); color: #fff; padding: 9px 16px; font-size: 13px; letter-spacing: 0.5px; }
                .row { display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding: 8px 16px; align-items: center; }
                .row:last-child { border-bottom: none; }
                .label { color: #6b7280; font-size: 12.5px; }
                .value { font-weight: 700; font-size: 13px; color: #111827; }
                
                /* ====== TABLE ====== */
                .table-container { padding: 12px 16px; }
                table { width: 100%; border-collapse: collapse; text-align: right; }
                th { color: #4b5563; font-size: 12px; font-weight: 700; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; }
                td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #1f2937; }
                tr:last-child td { border-bottom: none; }
                
                /* ====== TOTALS ====== */
                .totals { margin-top: 20px; background: linear-gradient(135deg, #ecfeff, #eff6ff); border: 2px solid #06B6D4; border-radius: 14px; padding: 16px 20px; }
                .grand-total { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #a5f3fc; }
                .grand-total .label { font-size: 15px; font-weight: 700; color: #0891b2; }
                .grand-total .value { font-size: 22px; font-weight: 900; color: #0891b2; }
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
                    <span class="invoice-badge">• إيصال استلام أحبار •</span>
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
                <span class="ord-badge">إيصال أحبار</span>
            </div>

            <div class="section">
                <div class="section-title">بيانات المورد</div>
                <div class="row"><span class="label">اسم المورد:</span><span class="value">${supplier?.name || '-'}</span></div>
                <div class="row"><span class="label">تاريخ التوريد:</span><span class="value">${supply.date}</span></div>
            </div>

            <div class="section">
                <div class="section-title">تفاصيل الألوان الموردة</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align: right;">اللون</th>
                                <th style="text-align: center;">الكمية</th>
                                <th style="text-align: center;">سعر الكجم</th>
                                <th style="text-align: left;">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${colors.map(c => `
                                <tr>
                                    <td style="text-align: right; font-weight: bold;">${c.color}</td>
                                    <td style="text-align: center;">${Number(c.quantity || 0).toLocaleString()} كجم</td>
                                    <td style="text-align: center;">${Number(c.cost || 0).toLocaleString()} ج.م</td>
                                    <td style="text-align: left; font-weight: bold;">${Number(safeMath.multiply(c.cost || 0, c.quantity || 0) || 0).toLocaleString()} ج.م</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="totals">
                <div class="grand-total">
                    <span class="label">إجمالي قيمة التوريدة:</span>
                    <span class="value">${Number(supply.totalPrice || 0).toLocaleString()} ج.م</span>
                </div>
                <div class="paid-row">
                    <span class="label">المبلغ المسدد في هذه العملية:</span>
                    <span class="value">${Number(supply.paidAmount || 0).toLocaleString()} ج.م</span>
                </div>
                <div class="remaining-row">
                    <span class="label">المديونية المتبقية من هذه العملية:</span>
                    <span class="value">${Number(supply.remainingAmount || 0).toLocaleString()} ج.م</span>
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

  const handleAddSupply = () => {
    const valid = supplyColors.filter(c => c.color && c.cost);
    if (!valid.length) { toast.error('أضف لوناً واحداً على الأقل'); return; }
    const total = totalSupply(valid);
    const paid = parseFloat(supplyPaid) || 0;
    const newSup = {
      id: Date.now().toString(), supplierId: id, supplierName: supplier.name,
      colors: valid, totalPrice: total, paidAmount: paid,
      remainingAmount: safeMath.subtract(total, paid),
      date: supplyDate, supplyNumber: `INK-${Date.now().toString().slice(-6)}`,
      type: 'INK', metadata: { colors: valid }
    };
    supabaseService.addSupplierSupply(newSup);
    toast.success('تم تسجيل التوريدة'); soundManager.play('save');
    setShowSupplyModal(false); setSupplyColors([emptyColor()]); setSupplyPaid('');

    // Auto print prompt
    setTimeout(() => {
      if (window.confirm('تم تسجيل التوريدة بنجاح! هل تود طباعة إيصال استلام للمورد الآن؟')) {
        handlePrintSupply(newSup);
      }
    }, 600);
  };

  const handleDeleteSupply = async (supId) => {
    if (!window.confirm('حذف هذه التوريدة؟')) return;
    try {
      await supabaseService.deleteSupplierSupply(supId);
      soundManager.play('delete');
    } catch (e) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleAddPayment = () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return; }
    const newPay = { id: Date.now().toString(), supplierId: id, supplierName: supplier.name, amount, note: payNote, date: getCurrentDate().split('T')[0], type: 'INK' };
    supabaseService.addSupplierPayment(newPay);
    toast.success('تم تسجيل الدفعة'); soundManager.play('save');
    setShowPayModal(false); setPayAmount(''); setPayNote('');
  };

  const handleDeletePayment = async (pId) => {
    if (!window.confirm('حذف هذه الدفعة؟')) return;
    try {
      await supabaseService.deleteSupplierPayment(pId);
      soundManager.play('delete');
    } catch (e) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const totalSpent = supplies.reduce((a, s) => safeMath.add(a, s.totalPrice || 0), 0);
  const paidInSup = supplies.reduce((a, s) => safeMath.add(a, s.paidAmount || 0), 0);
  const indepPaid = payments.reduce((a, p) => safeMath.add(a, p.amount || 0), 0);
  const totalPaid = safeMath.add(paidInSup, indepPaid);
  const remaining = safeMath.subtract(totalSpent, totalPaid);

  if (!supplier) return (
    <div className="p-8 text-center text-slate-400">
      <p>المورد غير موجود</p>
      <button onClick={() => navigate('/ink-suppliers')} className="mt-4 text-cyan-600 font-bold">← رجوع</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F4F9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-6 space-y-6 relative overflow-hidden pb-10">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3" style={{ animationDelay: '2s' }} />
      </div>

      {/* Back + Header */}
      <div className="relative z-10 flex items-center gap-3">
        <button onClick={() => navigate('/ink-suppliers')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-cyan-600 font-bold transition-colors">
          <ArrowRight className="h-4 w-4" /> موردو الأحبار
        </button>
        <span className="text-slate-350">/</span>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{supplier.name}</span>
      </div>

      {/* Supplier Info Card */}
      <div className="relative z-10 glass-card p-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Droplets className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-black dark:text-white">{supplier.name}</h1>
              <p className="text-sm text-black dark:text-slate-350">{supplier.phone} {supplier.email && `· ${supplier.email}`}</p>
              {supplier.address && <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">{supplier.address}</p>}
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center w-full lg:w-auto">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">إجمالي التوريدات</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">{totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2})} <span className="text-xs">ج.م</span></p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl px-4 py-3 border border-emerald-200 dark:border-emerald-900/40">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-1">إجمالي المدفوع</p>
              <p className="text-lg font-black text-emerald-705 dark:text-emerald-300">{totalPaid.toLocaleString('en-US', {minimumFractionDigits: 2})} <span className="text-xs">ج.م</span></p>
            </div>
            <div className={`rounded-xl px-4 py-3 border ${remaining > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40' : remaining < 0 ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
              <p className={`text-xs font-bold mb-1 ${remaining > 0 ? 'text-red-600 dark:text-red-400' : remaining < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {remaining > 0 ? 'المديونية المتبقية' : remaining < 0 ? 'رصيد مقدم (لك)' : 'المتبقي'}
              </p>
              <p className={`text-lg font-black ${remaining > 0 ? 'text-red-700 dark:text-red-300' : remaining < 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                {remaining !== 0 ? Math.abs(remaining).toLocaleString('en-US', {minimumFractionDigits: 2}) : 0} <span className="text-xs">ج.م</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 flex gap-3">
        <button onClick={() => setShowSupplyModal(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow">
          <Plus className="h-4 w-4" /> إضافة توريدة
        </button>
        <button onClick={() => setShowPayModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow">
          <DollarSign className="h-4 w-4" /> تسجيل دفعة
        </button>
      </div>

      {/* Supplies */}
      <div className="relative z-10 glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Package className="h-5 w-5 text-cyan-600" />
          <h2 className="font-black text-slate-800 dark:text-white">التوريدات ({supplies.length})</h2>
        </div>
        {supplies.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>لا توجد توريدات بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {supplies.map(sup => (
              <div key={sup.id} className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/20 px-2 py-1 rounded-full">{sup.supplyNumber}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{sup.date}</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-350">{sup.colors?.length} لون</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800 dark:text-white">{(sup.totalPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</p>
                      <p className="text-xs text-red-500 dark:text-red-400">متبقي: {(sup.remainingAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</p>
                    </div>
                    <button onClick={() => setExpandedSupply(expandedSupply === sup.id ? null : sup.id)}
                      className="text-slate-400 hover:text-cyan-600 p-1">
                      {expandedSupply === sup.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button onClick={() => handlePrintSupply(sup)}
                      className="text-cyan-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 p-1.5 rounded-lg transition-all"
                      title="طباعة إيصال التوريدة">
                      <Printer className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteSupply(sup.id)}
                      className="text-red-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {expandedSupply === sup.id && (
                  <div className="mt-3 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 space-y-1.5 border border-slate-100 dark:border-slate-800">
                    {(sup.colors || sup.metadata?.colors)?.map((c, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-white dark:bg-slate-800 border dark:border-slate-750 rounded-lg px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block"></span>
                          <span className="font-bold text-slate-700 dark:text-slate-350">{c.color}</span>
                          {c.quantity && <span className="text-slate-400 dark:text-slate-500 text-xs">— {c.quantity} كجم × {c.cost} ج.م</span>}
                        </div>
                        <span className="font-black text-slate-800 dark:text-white">{safeMath.multiply(c.cost || 0, c.quantity || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 text-xs font-bold text-emerald-650 dark:text-emerald-400">
                      <span>مدفوع: {(sup.paidAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="relative z-10 glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-650 dark:text-emerald-400" />
          <h2 className="font-black text-slate-800 dark:text-white">الدفعات ({payments.length})</h2>
        </div>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">لا توجد دفعات مستقلة</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {payments.map(p => (
              <div key={p.id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-slate-750 dark:text-slate-300">{p.date}</p>
                  {p.note && <p className="text-xs text-slate-400 dark:text-slate-500">{p.note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-400">{(p.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                  <button onClick={() => handleDeletePayment(p.id)}
                    className="text-red-400 hover:text-red-650 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supply Modal */}
      {showSupplyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">إضافة توريدة أحبار</h3>
              <button onClick={() => setShowSupplyModal(false)}><X className="h-5 w-5 text-slate-400 dark:text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">التاريخ</label>
                <input type="date" value={supplyDate} onChange={e => setSupplyDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-right" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">الألوان والتكاليف</label>
                  <button onClick={() => setSupplyColors([...supplyColors, emptyColor()])}
                    className="text-xs bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 px-2 py-1 rounded-lg font-bold hover:bg-cyan-200 dark:hover:bg-cyan-900 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> إضافة لون
                  </button>
                </div>
                <div className="space-y-2">
                  {supplyColors.map((col, idx) => (
                    <div key={col.id} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                      <input placeholder="اسم اللون" value={col.color}
                        onChange={e => setSupplyColors(supplyColors.map((c, i) => i === idx ? { ...c, color: e.target.value } : c))}
                        className="flex-1 px-2 py-1.5 border border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400 text-right" />
                      <input type="number" placeholder="كمية كجم" value={col.quantity}
                        onChange={e => setSupplyColors(supplyColors.map((c, i) => i === idx ? { ...c, quantity: e.target.value } : c))}
                        className="w-24 px-2 py-1.5 border border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-slate-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400 font-bold" />
                      <input type="number" placeholder="سعر الكجم" value={col.cost}
                        onChange={e => setSupplyColors(supplyColors.map((c, i) => i === idx ? { ...c, cost: e.target.value } : c))}
                        className="w-28 px-2 py-1.5 border border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-slate-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400 font-bold" />
                      {supplyColors.length > 1 && (
                        <button onClick={() => setSupplyColors(supplyColors.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-1 rounded"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/50 rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-cyan-700 dark:text-cyan-400">إجمالي التوريدة:</span>
                <span className="text-lg font-black text-cyan-800 dark:text-cyan-300">{totalSupply(supplyColors).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المبلغ المدفوع الآن (اختياري)</label>
                <input type="number" value={supplyPaid} onChange={e => setSupplyPaid(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-350 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold text-right" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAddSupply} className="flex-1 bg-cyan-600 text-white py-2 rounded-lg font-bold hover:bg-cyan-700">حفظ التوريدة</button>
              <button onClick={() => setShowSupplyModal(false)} className="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">تسجيل دفعة</h3>
              <button onClick={() => setShowPayModal(false)}><X className="h-5 w-5 text-slate-400 dark:text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المبلغ (ج.م)</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-350 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 dark:bg-slate-800 text-emerald-650 dark:text-emerald-400 font-bold text-right" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ملاحظة (اختياري)</label>
                <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-right" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAddPayment} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700">حفظ الدفعة</button>
              <button onClick={() => setShowPayModal(false)} className="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InkSupplierDetails;
