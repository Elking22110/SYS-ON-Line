import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Edit, Save, X, Search,
  ChevronDown, ChevronUp, DollarSign, Layers, Package, Droplets
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import soundManager from '../utils/soundManager.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import supabaseService from '../utils/supabaseService.js';
import { observerManager } from '../utils/observerManager.js';

const CLICHE_SUPPLIERS_KEY = 'cliche_suppliers';
const CLICHE_SUPPLIES_KEY = 'cliche_supplies';
const CLICHE_PAYMENTS_KEY = 'cliche_payments';

const ClicheSuppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  // Supply form
  const [clicheName, setClicheName] = useState('');
  const [clicheWidth, setClicheWidth] = useState('');
  const [clicheHeight, setClicheHeight] = useState('');
  const [pricePerCm, setPricePerCm] = useState('');
  const [supplyDate, setSupplyDate] = useState(getCurrentDate().split('T')[0]);
  const [supplyPaid, setSupplyPaid] = useState('');
  const [supplyNote, setSupplyNote] = useState('');

  const load = () => {
    setSuppliers(JSON.parse(localStorage.getItem(CLICHE_SUPPLIERS_KEY) || '[]'));
    setSupplies(JSON.parse(localStorage.getItem(CLICHE_SUPPLIES_KEY) || '[]'));
    setPayments(JSON.parse(localStorage.getItem(CLICHE_PAYMENTS_KEY) || '[]'));
  };

  useEffect(() => { 
    load(); 
    const unsubSuppliers = observerManager.subscribe('cliche_suppliers_changed', load);
    const unsubSupplies = observerManager.subscribe('cliche_supplies_changed', load);
    const unsubPayments = observerManager.subscribe('cliche_payments_changed', load);
    return () => { unsubSuppliers(); unsubSupplies(); unsubPayments(); };
  }, []);

  const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  // Total = width × height × pricePerCm
  const calcTotal = () => {
    const w = parseFloat(clicheWidth) || 0;
    const h = parseFloat(clicheHeight) || 0;
    const p = parseFloat(pricePerCm) || 0;
    const area = safeMath.multiply(w, h);
    return safeMath.multiply(area, p);
  };

  // ── Supplier CRUD ──
  const handleSaveSupplier = async () => {
    if (!form.name || !form.phone) { toast.error('اسم ورقم الهاتف مطلوبان'); return; }
    const sData = { ...form, type: 'CLICHE' };
    try {
      if (editingSupplier) {
        await supabaseService.updateSupplier(editingSupplier.id, sData);
        toast.success('تم تحديث المورد');
      } else {
        await supabaseService.addSupplier(sData);
        toast.success('تم إضافة مورد الأكلشيهات');
      }
      soundManager.play('save');
      setShowAddModal(false);
      setEditingSupplier(null);
      setForm({ name: '', phone: '', email: '', address: '' });
    } catch (e) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا المورد؟')) return;
    try {
      await supabaseService.deleteSupplier(id);
      soundManager.play('delete');
    } catch (e) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  // ── Supply ──
  const resetSupplyForm = () => {
    setClicheName(''); setClicheWidth(''); setClicheHeight('');
    setPricePerCm(''); setSupplyPaid(''); setSupplyNote('');
    setSupplyDate(getCurrentDate().split('T')[0]);
  };

  const handleAddSupply = async () => {
    if (!clicheName || !pricePerCm) { toast.error('أدخل اسم الأكلشية وسعر السنتيمتر'); return; }
    const total = calcTotal();
    const paid = parseFloat(supplyPaid) || 0;
    const newSupply = {
      id: Date.now().toString(),
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      clicheName,
      clicheWidth: parseFloat(clicheWidth) || 0,
      clicheHeight: parseFloat(clicheHeight) || 0,
      pricePerCm: parseFloat(pricePerCm) || 0,
      totalPrice: total,
      paidAmount: paid,
      remainingAmount: safeMath.subtract(total, paid),
      note: supplyNote,
      date: supplyDate,
      supplyNumber: `CLICHE-${Date.now().toString().slice(-6)}`,
      type: 'CLICHE',
      metadata: { clicheName, width: clicheWidth, height: clicheHeight, pricePerCm }
    };
    try {
      await supabaseService.addSupplierSupply(newSupply);
      toast.success('تم تسجيل التوريدة');
      soundManager.play('save');
      setShowSupplyModal(false);
      resetSupplyForm();
    } catch (e) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  // ── Payment ──
  const handleAddPayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return; }
    const newPay = {
      id: Date.now().toString(),
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      amount,
      note: payNote,
      date: getCurrentDate().split('T')[0],
      type: 'CLICHE'
    };
    try {
      await supabaseService.addSupplierPayment(newPay);
      toast.success('تم تسجيل الدفعة');
      soundManager.play('save');
      setShowPayModal(false);
      setPayAmount(''); setPayNote('');
    } catch (e) {
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
    }
  };

  const getStats = (sId) => {
    const sups = supplies.filter(s => s.supplierId === sId);
    const pays = payments.filter(p => p.supplierId === sId);
    const totalSpent = sups.reduce((a, s) => safeMath.add(a, s.totalPrice || 0), 0);
    const paidInSup = sups.reduce((a, s) => safeMath.add(a, s.paidAmount || 0), 0);
    const indepPaid = pays.reduce((a, p) => safeMath.add(a, p.amount || 0), 0);
    const totalPaid = safeMath.add(paidInSup, indepPaid);
    return { totalSpent, totalPaid, remaining: safeMath.subtract(totalSpent, totalPaid), count: sups.length };
  };

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 p-4 md:p-6 space-y-4">

        {/* Supplier Type Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 w-fit">
          <button onClick={() => navigate('/suppliers')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all text-slate-600 hover:bg-slate-100">
            <Package className="h-4 w-4" /> موردو الخامات
          </button>
          <button onClick={() => navigate('/ink-suppliers')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all text-slate-600 hover:bg-slate-100">
            <Droplets className="h-4 w-4 text-cyan-600" /> موردو الأحبار
          </button>
          <button onClick={() => navigate('/cliche-suppliers')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all bg-purple-600 text-white shadow">
            <Layers className="h-4 w-4" /> موردو الأكلشيهات
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-6 w-6 text-purple-600" /> موردو الأكلشيهات
            </h1>
            <p className="text-sm text-slate-500">إدارة موردي الأكلشيهات وتوريداتهم</p>
          </div>
          <button
            onClick={() => { setEditingSupplier(null); setForm({ name: '', phone: '', email: '', address: '' }); setShowAddModal(true); }}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> إضافة مورد أكلشيهات
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input type="text" placeholder="بحث..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="glass-card p-10 text-center text-slate-400">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا يوجد موردو أكلشيهات. أضف أول مورد!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(supplier => {
              const stats = getStats(supplier.id);
              const isExpanded = expandedId === supplier.id;
              const supList = supplies.filter(s => s.supplierId === supplier.id);
              const payList = payments.filter(p => p.supplierId === supplier.id);
              return (
                <div key={supplier.id} className="glass-card overflow-hidden">
                  <div className="p-4 flex flex-col md:flex-row justify-between items-start gap-3">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/cliche-suppliers/${supplier.id}`)}>
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow">
                        <Layers className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 hover:text-purple-600 transition-colors">{supplier.name}</p>
                        <p className="text-xs text-slate-500">{supplier.phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap text-xs">
                      <span className="bg-slate-100 px-2 py-1 rounded-lg font-bold text-slate-700">إجمالي: {stats.totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                      <span className="bg-emerald-100 px-2 py-1 rounded-lg font-bold text-emerald-700">مدفوع: {stats.totalPaid.toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                      <span className={`px-2 py-1 rounded-lg font-bold ${stats.remaining > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        متبقي: {stats.remaining.toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedSupplier(supplier); setShowSupplyModal(true); }}
                        className="bg-purple-600 hover:bg-purple-700 text-white action-button" title="إضافة توريدة">
                        <Plus />
                      </button>
                      <button onClick={() => { setSelectedSupplier(supplier); setShowPayModal(true); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white action-button" title="تسجيل دفعة">
                        <DollarSign />
                      </button>
                      <button onClick={() => { setEditingSupplier(supplier); setForm({ name: supplier.name, phone: supplier.phone, email: supplier.email || '', address: supplier.address || '' }); setShowAddModal(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white action-button"><Edit /></button>
                      <button onClick={() => handleDelete(supplier.id)}
                        className="bg-red-600 hover:bg-red-700 text-white action-button"><Trash2 /></button>
                      <button onClick={() => setExpandedId(isExpanded ? null : supplier.id)}
                        className="bg-slate-600 hover:bg-slate-700 text-white action-button">
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                      <h4 className="font-bold text-purple-700 flex items-center gap-2"><Package className="h-4 w-4" /> التوريدات</h4>
                      {supList.length === 0 ? <p className="text-slate-400 text-sm">لا توجد توريدات بعد</p> : (
                        <div className="space-y-3">
                          {supList.map(sup => (
                            <div key={sup.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{sup.supplyNumber}</span>
                                <span className="text-xs text-slate-400">{sup.date}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                <div><span className="text-slate-500">الأكلشية:</span> <span className="font-bold text-slate-800">{sup.clicheName || sup.metadata?.clicheName}</span></div>
                                <div><span className="text-slate-500">المقاس:</span> <span className="font-bold text-slate-800">{sup.clicheWidth || sup.metadata?.width} × {sup.clicheHeight || sup.metadata?.height} سم</span></div>
                                <div><span className="text-slate-500">سعر السم:</span> <span className="font-bold text-slate-800">{sup.pricePerCm || sup.metadata?.pricePerCm} ج.م</span></div>
                                <div><span className="text-slate-500">المساحة:</span> <span className="font-bold text-slate-800">{((sup.clicheWidth || sup.metadata?.width) * (sup.clicheHeight || sup.metadata?.height)).toFixed(2)} سم²</span></div>
                              </div>
                              {sup.note && <p className="text-xs text-slate-400 mb-1">ملاحظة: {sup.note}</p>}
                              <div className="flex justify-between pt-2 border-t border-slate-100 text-xs font-bold">
                                <span>الإجمالي: {(sup.totalPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                                <span className="text-emerald-600">مدفوع: {(sup.paidAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                                <span className="text-red-600">متبقي: {(sup.remainingAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {payList.length > 0 && (
                        <>
                          <h4 className="font-bold text-emerald-700 flex items-center gap-2"><DollarSign className="h-4 w-4" /> الدفعات المستقلة</h4>
                          <div className="space-y-1">
                            {payList.map(p => (
                              <div key={p.id} className="flex justify-between text-sm bg-emerald-50 rounded-lg px-3 py-2">
                                <span className="text-slate-600">{p.date} {p.note && `— ${p.note}`}</span>
                                <span className="font-bold text-emerald-700">{(p.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-600" />
                {editingSupplier ? 'تعديل مورد أكلشيهات' : 'إضافة مورد أكلشيهات جديد'}
              </h3>
              <button onClick={() => { setShowAddModal(false); setEditingSupplier(null); }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              {[['name', 'اسم المورد', 'text'], ['phone', 'رقم الهاتف', 'tel'], ['email', 'البريد الإلكتروني', 'email'], ['address', 'العنوان', 'text']].map(([k, l, t]) => (
                <div key={k}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{l}</label>
                  <input type={t} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSaveSupplier} className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700">
                <Save className="h-4 w-4 inline ml-1" />{editingSupplier ? 'تحديث' : 'حفظ'}
              </button>
              <button onClick={() => { setShowAddModal(false); setEditingSupplier(null); }}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supply Modal */}
      {showSupplyModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">إضافة توريدة أكلشية — {selectedSupplier.name}</h3>
              <button onClick={() => setShowSupplyModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ التوريدة</label>
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
                  <input type="number" value={clicheWidth} onChange={e => setClicheWidth(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 text-center" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">الطول (سم)</label>
                  <input type="number" value={clicheHeight} onChange={e => setClicheHeight(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 text-center" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">سعر السنتيمتر المربع (ج.م / سم²)</label>
                <input type="number" value={pricePerCm} onChange={e => setPricePerCm(e.target.value)}
                  placeholder="0.00" step="0.01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 text-center" />
              </div>

              {/* Auto-calculated total */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>المساحة: {((parseFloat(clicheWidth)||0) * (parseFloat(clicheHeight)||0)).toFixed(2)} سم²</span>
                  <span>× {parseFloat(pricePerCm)||0} ج.م/سم²</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-purple-700">إجمالي التوريدة:</span>
                  <span className="text-lg font-black text-purple-800">
                    {calcTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ المدفوع الآن (اختياري)</label>
                <input type="number" value={supplyPaid} onChange={e => setSupplyPaid(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظة (اختياري)</label>
                <input type="text" value={supplyNote} onChange={e => setSupplyNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAddSupply} className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700">
                <Save className="h-4 w-4 inline ml-1" /> حفظ التوريدة
              </button>
              <button onClick={() => setShowSupplyModal(false)}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">تسجيل دفعة — {selectedSupplier.name}</h3>
              <button onClick={() => setShowPayModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ (ج.م)</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  placeholder="0.00"
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
              <button onClick={() => setShowPayModal(false)}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClicheSuppliers;
