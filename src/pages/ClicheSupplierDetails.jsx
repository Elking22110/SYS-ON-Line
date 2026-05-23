import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, X, Layers, DollarSign, ArrowRight, Package, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import soundManager from '../utils/soundManager.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import supabaseService from '../utils/supabaseService.js';
import { observerManager } from '../utils/observerManager.js';
import { printHtmlContent } from '../utils/printHelper.js';

const CLICHE_SUPPLIERS_KEY = 'cliche_suppliers';
const CLICHE_SUPPLIES_KEY = 'cliche_supplies';
const CLICHE_PAYMENTS_KEY = 'cliche_payments';

const ClicheSupplierDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [expandedSupply, setExpandedSupply] = useState(null);

  // Supply form
  const [clicheName, setClicheName] = useState('');
  const [clicheWidth, setClicheWidth] = useState('');
  const [clicheHeight, setClicheHeight] = useState('');
  const [pricePerCm, setPricePerCm] = useState('');
  const [supplyDate, setSupplyDate] = useState(getCurrentDate().split('T')[0]);
  const [supplyPaid, setSupplyPaid] = useState('');
  const [supplyNote, setSupplyNote] = useState('');

  const load = () => {
    const all = JSON.parse(localStorage.getItem(CLICHE_SUPPLIERS_KEY) || '[]');
    setSupplier(all.find(s => s.id === id) || null);
    const allSup = JSON.parse(localStorage.getItem(CLICHE_SUPPLIES_KEY) || '[]');
    setSupplies(allSup.filter(s => s.supplierId === id).sort((a, b) => b.id - a.id));
    const allPay = JSON.parse(localStorage.getItem(CLICHE_PAYMENTS_KEY) || '[]');
    setPayments(allPay.filter(p => p.supplierId === id).sort((a, b) => b.id - a.id));
  };

  useEffect(() => { 
    load(); 
    const unsubSuppliers = observerManager.subscribe('cliche_suppliers_changed', load);
    const unsubSupplies = observerManager.subscribe('cliche_supplies_changed', load);
    const unsubPayments = observerManager.subscribe('cliche_payments_changed', load);
    return () => { unsubSuppliers(); unsubSupplies(); unsubPayments(); };
  }, [id]);

  const calcTotal = () => {
    const w = parseFloat(clicheWidth) || 0;
    const h = parseFloat(clicheHeight) || 0;
    const p = parseFloat(pricePerCm) || 0;
    const area = safeMath.multiply(w, h);
    return safeMath.multiply(area, p);
  };

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

    const width = supply.clicheWidth || supply.metadata?.width || 0;
    const height = supply.clicheHeight || supply.metadata?.height || 0;
    const area = safeMath.multiply(width, height);
    const pPerCm = supply.pricePerCm || supply.metadata?.pricePerCm || 0;

    const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>إيصال استلام أكلشيه - ${supply.supplyNumber}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 28px; color: #1a1a2e; line-height: 1.6; background: #f8f9fe; }
                /* ====== HEADER ====== */
                .invoice-header { background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); border-radius: 16px; padding: 28px 32px 22px; margin-bottom: 24px; color: #fff; position: relative; overflow: hidden; }
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
                .order-strip { background: #fff; border-radius: 12px; padding: 14px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 12px rgba(124,58,237,0.10); border-right: 5px solid #7C3AED; }
                .order-strip .ord-label { font-size: 13px; color: #6b7280; }
                .order-strip .ord-value { font-size: 20px; font-weight: 900; color: #7C3AED; }
                .order-strip .ord-badge { background: #f5f3ff; color: #7C3AED; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
                /* ====== SECTIONS ====== */
                .section { margin-bottom: 18px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }
                .section-title { font-weight: 700; background: linear-gradient(90deg, #7C3AED, #EC4899); color: #fff; padding: 9px 16px; font-size: 13px; letter-spacing: 0.5px; }
                .row { display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding: 8px 16px; align-items: center; }
                .row:last-child { border-bottom: none; }
                .label { color: #6b7280; font-size: 12.5px; }
                .value { font-weight: 700; font-size: 13px; color: #111827; }
                /* ====== TOTALS ====== */
                .totals { margin-top: 20px; background: linear-gradient(135deg, #f5f3ff, #fdf2f8); border: 2px solid #7C3AED; border-radius: 14px; padding: 16px 20px; }
                .grand-total { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #f472b6; }
                .grand-total .label { font-size: 15px; font-weight: 700; color: #7C3AED; }
                .grand-total .value { font-size: 22px; font-weight: 900; color: #7C3AED; }
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
                    <span class="invoice-badge">• إيصال استلام أكلشيه •</span>
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
                <span class="ord-badge">إيصال أكلشيهات</span>
            </div>

            <div class="section">
                <div class="section-title">بيانات المورد</div>
                <div class="row"><span class="label">اسم المورد:</span><span class="value">${supplier?.name || '-'}</span></div>
                <div class="row"><span class="label">تاريخ التوريد:</span><span class="value">${supply.date}</span></div>
            </div>

            <div class="section">
                <div class="section-title">تفاصيل الأكلشية</div>
                <div class="row"><span class="label">اسم / وصف الأكلشية:</span><span class="value">${supply.clicheName || supply.metadata?.clicheName}</span></div>
                <div class="row"><span class="label">المقاس:</span><span class="value">${width} × ${height} سم</span></div>
                <div class="row"><span class="label">المساحة الإجمالية:</span><span class="value">${area.toFixed(2)} سم²</span></div>
                <div class="row"><span class="label">سعر السنتيمتر المربع:</span><span class="value">${pPerCm.toLocaleString()} ج.م</span></div>
                ${supply.note ? `<div class="row"><span class="label">ملاحظات:</span><span class="value">${supply.note}</span></div>` : ''}
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
    if (!clicheName || !pricePerCm) { toast.error('أدخل اسم الأكلشية وسعر السنتيمتر'); return; }
    const total = calcTotal();
    const paid = parseFloat(supplyPaid) || 0;
    const newSup = {
      id: Date.now().toString(), supplierId: id, supplierName: supplier.name,
      clicheName, clicheWidth: parseFloat(clicheWidth) || 0, clicheHeight: parseFloat(clicheHeight) || 0,
      pricePerCm: parseFloat(pricePerCm) || 0, totalPrice: total, paidAmount: paid,
      remainingAmount: safeMath.subtract(total, paid), note: supplyNote, date: supplyDate,
      supplyNumber: `CLICHE-${Date.now().toString().slice(-6)}`,
      type: 'CLICHE', metadata: { clicheName, width: clicheWidth, height: clicheHeight, pricePerCm }
    };
    supabaseService.addSupplierSupply(newSup);
    toast.success('تم تسجيل التوريدة'); soundManager.play('save');
    setShowSupplyModal(false);
    setClicheName(''); setClicheWidth(''); setClicheHeight(''); setPricePerCm(''); setSupplyPaid(''); setSupplyNote('');

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
    const newPay = { id: Date.now().toString(), supplierId: id, supplierName: supplier.name, amount, note: payNote, date: getCurrentDate().split('T')[0], type: 'CLICHE' };
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
      <button onClick={() => navigate('/cliche-suppliers')} className="mt-4 text-purple-600 font-bold">← رجوع</button>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/cliche-suppliers')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-purple-600 font-bold transition-colors">
          <ArrowRight className="h-4 w-4" /> موردو الأكلشيهات
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-bold text-slate-700">{supplier.name}</span>
      </div>

      {/* Supplier Info */}
      <div className="glass-card p-5">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Layers className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">{supplier.name}</h1>
              <p className="text-sm text-slate-500">{supplier.phone} {supplier.email && `· ${supplier.email}`}</p>
              {supplier.address && <p className="text-xs text-slate-400 mt-0.5">{supplier.address}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <p className="text-xs text-slate-500 font-bold mb-1">إجمالي التوريدات</p>
              <p className="text-lg font-black text-slate-800">{totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2})} <span className="text-xs">ج.م</span></p>
            </div>
            <div className="bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-bold mb-1">إجمالي المدفوع</p>
              <p className="text-lg font-black text-emerald-700">{totalPaid.toLocaleString('en-US', {minimumFractionDigits: 2})} <span className="text-xs">ج.م</span></p>
            </div>
            <div className={`rounded-xl px-4 py-3 border ${remaining > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-xs font-bold mb-1 ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>المتبقي</p>
              <p className={`text-lg font-black ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>{remaining.toLocaleString('en-US', {minimumFractionDigits: 2})} <span className="text-xs">ج.م</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => setShowSupplyModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow">
          <Plus className="h-4 w-4" /> إضافة توريدة
        </button>
        <button onClick={() => setShowPayModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow">
          <DollarSign className="h-4 w-4" /> تسجيل دفعة
        </button>
      </div>

      {/* Supplies */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <Package className="h-5 w-5 text-purple-600" />
          <h2 className="font-black text-slate-800">التوريدات ({supplies.length})</h2>
        </div>
        {supplies.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>لا توجد توريدات بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {supplies.map(sup => (
              <div key={sup.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{sup.supplyNumber}</span>
                      <span className="text-xs text-slate-400">{sup.date}</span>
                    </div>
                    <p className="font-bold text-slate-800">{sup.clicheName || sup.metadata?.clicheName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sup.clicheWidth || sup.metadata?.width} × {sup.clicheHeight || sup.metadata?.height} سم · {sup.pricePerCm || sup.metadata?.pricePerCm} ج.م/سم²
                      <span className="mr-2 text-slate-400">مساحة: {((sup.clicheWidth || sup.metadata?.width) * (sup.clicheHeight || sup.metadata?.height)).toFixed(2)} سم²</span>
                    </p>
                    {sup.note && <p className="text-xs text-slate-400 mt-0.5">{sup.note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">{(sup.totalPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</p>
                      <p className="text-xs text-emerald-600">مدفوع: {(sup.paidAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</p>
                      <p className="text-xs text-red-500">متبقي: {(sup.remainingAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</p>
                    </div>
                    <button onClick={() => handlePrintSupply(sup)}
                      className="text-purple-500 hover:text-purple-600 hover:bg-purple-50 p-1.5 rounded-lg transition-all"
                      title="طباعة إيصال التوريدة">
                      <Printer className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteSupply(sup.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <h2 className="font-black text-slate-800">الدفعات ({payments.length})</h2>
        </div>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">لا توجد دفعات مستقلة</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map(p => (
              <div key={p.id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-slate-700">{p.date}</p>
                  {p.note && <p className="text-xs text-slate-400">{p.note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-emerald-700">{(p.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                  <button onClick={() => handleDeletePayment(p.id)}
                    className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">إضافة توريدة أكلشية</h3>
              <button onClick={() => setShowSupplyModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">التاريخ</label>
                <input type="date" value={supplyDate} onChange={e => setSupplyDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">اسم / وصف الأكلشية</label>
                <input type="text" value={clicheName} onChange={e => setClicheName(e.target.value)}
                  placeholder="مثال: أكلشية شنطة كارفور"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">العرض (سم)</label>
                  <input type="number" value={clicheWidth} onChange={e => setClicheWidth(e.target.value)} placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 text-center" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">الطول (سم)</label>
                  <input type="number" value={clicheHeight} onChange={e => setClicheHeight(e.target.value)} placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 text-center" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">سعر السنتيمتر المربع (ج.م / سم²)</label>
                <input type="number" value={pricePerCm} onChange={e => setPricePerCm(e.target.value)} placeholder="0.00" step="0.01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 text-center" />
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>المساحة: {((parseFloat(clicheWidth)||0)*(parseFloat(clicheHeight)||0)).toFixed(2)} سم²</span>
                  <span>× {parseFloat(pricePerCm)||0} ج.م/سم²</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-purple-700">إجمالي التوريدة:</span>
                  <span className="text-lg font-black text-purple-800">{calcTotal().toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ المدفوع الآن (اختياري)</label>
                <input type="number" value={supplyPaid} onChange={e => setSupplyPaid(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظة (اختياري)</label>
                <input type="text" value={supplyNote} onChange={e => setSupplyNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAddSupply} className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700">حفظ التوريدة</button>
              <button onClick={() => setShowSupplyModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">تسجيل دفعة</h3>
              <button onClick={() => setShowPayModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ (ج.م)</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظة (اختياري)</label>
                <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAddPayment} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700">حفظ الدفعة</button>
              <button onClick={() => setShowPayModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClicheSupplierDetails;
