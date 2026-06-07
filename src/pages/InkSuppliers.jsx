import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, User, Phone, Mail, FileText, Search,
  ChevronDown, ChevronUp, Edit, Save, X, Droplets, DollarSign, Package, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import soundManager from '../utils/soundManager.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import supabaseService from '../utils/supabaseService.js';
import { observerManager } from '../utils/observerManager.js';

const INK_SUPPLIERS_KEY = 'ink_suppliers';
const INK_SUPPLIES_KEY = 'ink_supplies';
const INK_PAYMENTS_KEY = 'ink_payments';

const emptyColor = () => ({ id: Date.now() + Math.random(), color: '', quantity: '', cost: '' });

const InkSuppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplyColors, setSupplyColors] = useState([emptyColor()]);
  const [supplyDate, setSupplyDate] = useState(getCurrentDate().split('T')[0]);
  const [supplyPaid, setSupplyPaid] = useState('');
  const [supplies, setSupplies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  const load = async () => {
    try {
      const [onlineSuppliers, onlineSupplies, onlinePayments] = await Promise.all([
          supabaseService.getSuppliers('INK'),
          supabaseService.getAllSupplierSupplies('INK'),
          supabaseService.getAllSupplierPayments('INK')
      ]);
      
      const allSuppliers = onlineSuppliers || JSON.parse(localStorage.getItem(INK_SUPPLIERS_KEY) || '[]');
      const allSupplies = onlineSupplies || JSON.parse(localStorage.getItem(INK_SUPPLIES_KEY) || '[]');
      const allPayments = onlinePayments || JSON.parse(localStorage.getItem(INK_PAYMENTS_KEY) || '[]');
      
      if (onlineSuppliers) localStorage.setItem(INK_SUPPLIERS_KEY, JSON.stringify(onlineSuppliers));
      if (onlineSupplies) localStorage.setItem(INK_SUPPLIES_KEY, JSON.stringify(onlineSupplies));
      if (onlinePayments) localStorage.setItem(INK_PAYMENTS_KEY, JSON.stringify(onlinePayments));

      setSuppliers(allSuppliers);
      setSupplies(allSupplies);
      setPayments(allPayments);
    } catch (e) {
      console.error('Error loading ink suppliers data:', e);
      setSuppliers(JSON.parse(localStorage.getItem(INK_SUPPLIERS_KEY) || '[]'));
      setSupplies(JSON.parse(localStorage.getItem(INK_SUPPLIES_KEY) || '[]'));
      setPayments(JSON.parse(localStorage.getItem(INK_PAYMENTS_KEY) || '[]'));
    }
  };

  useEffect(() => { 
    load(); 
    const unsubSuppliers = observerManager.subscribe('ink_suppliers_changed', load);
    const unsubSupplies = observerManager.subscribe('ink_supplies_changed', load);
    const unsubPayments = observerManager.subscribe('ink_payments_changed', load);
    return () => { unsubSuppliers(); unsubSupplies(); unsubPayments(); };
  }, []);

  const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  // ── Supplier CRUD ──
  const handleSaveSupplier = async () => {
    if (!form.name || !form.phone) { toast.error('اسم ورقم الهاتف مطلوبان'); return; }
    const sData = { ...form, type: 'INK' };
    try {
      if (editingSupplier) {
        const res = await supabaseService.updateSupplier(editingSupplier.id, sData);
        const updated = suppliers.map(s => s.id === editingSupplier.id ? { ...s, ...res } : s);
        setSuppliers(updated);
        localStorage.setItem(INK_SUPPLIERS_KEY, JSON.stringify(updated));
        toast.success('تم تحديث المورد');
      } else {
        const res = await supabaseService.addSupplier(sData);
        const updated = [...suppliers, { ...sData, ...res }];
        setSuppliers(updated);
        localStorage.setItem(INK_SUPPLIERS_KEY, JSON.stringify(updated));
        toast.success('تم إضافة مورد الأحبار');
      }
      soundManager.play('save');
      setShowAddModal(false);
      setEditingSupplier(null);
      setForm({ name: '', phone: '', email: '', address: '' });
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا المورد؟')) return;
    try {
      await supabaseService.deleteSupplier(id);
      // Update local state immediately
      const updated = suppliers.filter(s => s.id !== id && String(s.id) !== String(id));
      setSuppliers(updated);
      localStorage.setItem(INK_SUPPLIERS_KEY, JSON.stringify(updated));

      // Cleanup Ghost Data locally
      const updatedSupplies = supplies.filter(s => String(s.supplierId) !== String(id));
      setSupplies(updatedSupplies);
      localStorage.setItem(INK_SUPPLIES_KEY, JSON.stringify(updatedSupplies));

      const updatedPayments = payments.filter(p => String(p.supplierId) !== String(id));
      setPayments(updatedPayments);
      localStorage.setItem(INK_PAYMENTS_KEY, JSON.stringify(updatedPayments));

      soundManager.play('delete');
      toast.success('تم حذف المورد');
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

    // ── Supply ──
  const totalSupply = (colors) => colors.reduce((s, c) => {
    const total = safeMath.multiply(parseFloat(c.cost) || 0, parseFloat(c.quantity) || 0);
    return safeMath.add(s, total);
  }, 0);

  const handleAddSupply = async () => {
    const validColors = supplyColors.filter(c => c.color && c.cost);
    if (!validColors.length) { toast.error('أضف لون واحد على الأقل'); return; }
    const total = totalSupply(validColors);
    const paid = parseFloat(supplyPaid) || 0;
    const newSupply = {
      id: Date.now().toString(),
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      colors: validColors,
      totalPrice: total,
      paidAmount: paid,
      remainingAmount: safeMath.subtract(total, paid),
      date: supplyDate,
      supplyNumber: `INK-${Date.now().toString().slice(-6)}`,
      type: 'INK',
      metadata: { colors: validColors }
    };
    
    // Optimistic Update
    const updated = [...supplies, newSupply];
    setSupplies(updated);
    localStorage.setItem(INK_SUPPLIES_KEY, JSON.stringify(updated));
    toast.success('تم تسجيل التوريدة');
    soundManager.play('save');
    setShowSupplyModal(false);
    setSupplyColors([emptyColor()]);
    setSupplyPaid('');

    try {
      await supabaseService.addSupplierSupply(newSupply);
    } catch (e) {
      console.error('Supabase error:', e);
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
      type: 'INK'
    };

    // Optimistic Update
    const updated = [...payments, newPay];
    setPayments(updated);
    localStorage.setItem(INK_PAYMENTS_KEY, JSON.stringify(updated));
    toast.success('تم تسجيل الدفعة');
    soundManager.play('save');
    setShowPayModal(false);
    setPayAmount('');
    setPayNote('');

    try {
      await supabaseService.addSupplierPayment(newPay);
    } catch (e) {
      console.error('Supabase error:', e);
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
    <div className="min-h-screen bg-[#F3F4F9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 relative overflow-hidden pb-10">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 p-4 md:p-6 space-y-4">

        {/* Supplier Type Tabs */}
        <div className="flex gap-2 bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-sm border border-slate-200 dark:border-slate-800 w-fit">
          <button onClick={() => navigate('/suppliers')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850">
            <Package className="h-4 w-4" /> موردو الخامات
          </button>
          <button onClick={() => navigate('/ink-suppliers')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all bg-cyan-600 text-white shadow">
            <Droplets className="h-4 w-4" /> موردو الأحبار
          </button>
          <button onClick={() => navigate('/cliche-suppliers')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850">
            <Layers className="h-4 w-4 text-purple-650" /> موردو الأكلشيهات
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Droplets className="h-6 w-6 text-cyan-600" /> موردو الأحبار
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">إدارة موردي الأحبار وتوريداتهم</p>
          </div>
          <button
            onClick={() => { setEditingSupplier(null); setForm({ name: '', phone: '', email: '', address: '' }); setShowAddModal(true); }}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> إضافة مورد أحبار
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="بحث..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white dark:bg-slate-900 focus:border-transparent transition-all"
          />
        </div>

        {/* Suppliers List */}
        {filtered.length === 0 ? (
          <div className="glass-card p-10 text-center text-slate-400">
            <Droplets className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا يوجد موردو أحبار. أضف أول مورد!</p>
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
                  {/* Card Header */}
                  <div className="p-4 flex flex-col md:flex-row justify-between items-start gap-3">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/ink-suppliers/${supplier.id}`)}>
                      <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow">
                        <Droplets className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white hover:text-cyan-600 transition-colors">{supplier.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-450">{supplier.phone}</p>
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="flex gap-2 flex-wrap text-xs">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg font-bold text-slate-700 dark:text-slate-300">إجمالي: {stats.totalSpent.toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                      <span className="bg-emerald-100 dark:bg-emerald-950/20 px-2 py-1 rounded-lg font-bold text-emerald-700 dark:text-emerald-400">مدفوع: {stats.totalPaid.toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                      <span className={`px-2 py-1 rounded-lg font-bold ${stats.remaining > 0 ? 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400'}`}>
                        متبقي: {stats.remaining.toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : supplier.id); }}
                        className="bg-slate-500 hover:bg-slate-650 text-white action-button" title={isExpanded ? "إغلاق التفاصيل" : "عرض التفاصيل"}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => { setSelectedSupplier(supplier); setShowSupplyModal(true); }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white action-button" title="إضافة توريدة">
                        <Plus className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setSelectedSupplier(supplier); setShowPayModal(true); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white action-button" title="تسجيل دفعة">
                        <DollarSign className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setEditingSupplier(supplier); setForm({ name: supplier.name, phone: supplier.phone, email: supplier.email || '', address: supplier.address || '' }); setShowAddModal(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white action-button" title="تعديل">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(supplier.id)}
                        className="bg-red-600 hover:bg-red-700 text-white action-button" title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {/* Expanded Supplies */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40 space-y-4">
                      {/* Supplies */}
                      <h4 className="font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-2"><Package className="h-4 w-4" /> التوريدات</h4>
                      {supList.length === 0 ? <p className="text-slate-400 dark:text-slate-500 text-sm">لا توجد توريدات بعد</p> : (
                        <div className="space-y-3">
                          {supList.map(sup => (
                            <div key={sup.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/20 px-2 py-0.5 rounded-full">{sup.supplyNumber}</span>
                                <span className="text-xs text-slate-400 dark:text-slate-500">{sup.date}</span>
                              </div>
                              <div className="space-y-1">
                                {(sup.colors || sup.metadata?.colors)?.map((c, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">🎨 {c.color} — {c.quantity} كجم × {c.cost} ج.م</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{safeMath.multiply(c.cost || 0, c.quantity || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                                <span>الإجمالي: {(sup.totalPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                                <span className="text-emerald-600 dark:text-emerald-400">مدفوع: {(sup.paidAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                                <span className="text-red-650 dark:text-red-400">متبقي: {(sup.remainingAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Payments */}
                      {payList.length > 0 && (
                        <>
                          <h4 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2"><DollarSign className="h-4 w-4" /> الدفعات المستقلة</h4>
                          <div className="space-y-1">
                            {payList.map(p => (
                              <div key={p.id} className="flex justify-between text-sm bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2">
                                <span className="text-slate-600 dark:text-slate-300">{p.date} {p.note && `— ${p.note}`}</span>
                                <span className="font-bold text-emerald-750 dark:text-emerald-400">{(p.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Droplets className="h-5 w-5 text-cyan-600" />
                {editingSupplier ? 'تعديل مورد أحبار' : 'إضافة مورد أحبار جديد'}
              </h3>
              <button onClick={() => { setShowAddModal(false); setEditingSupplier(null); }}><X className="h-5 w-5 text-slate-400 dark:text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              {[['name', 'اسم المورد', 'text'], ['phone', 'رقم الهاتف', 'tel'], ['email', 'البريد الإلكتروني', 'email'], ['address', 'العنوان', 'text']].map(([k, l, t]) => (
                <div key={k}>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{l}</label>
                  <input type={t} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-slate-50 dark:bg-slate-800 focus:bg-white text-right" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSaveSupplier} className="flex-1 bg-cyan-600 text-white py-2 rounded-lg font-bold hover:bg-cyan-700 transition-all">
                <Save className="h-4 w-4 inline ml-1" />{editingSupplier ? 'تحديث' : 'حفظ'}
              </button>
              <button onClick={() => { setShowAddModal(false); setEditingSupplier(null); }}
                className="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supply Modal */}
      {showSupplyModal && selectedSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-850 dark:text-white">إضافة توريدة أحبار — {selectedSupplier.name}</h3>
              <button onClick={() => setShowSupplyModal(false)}><X className="h-5 w-5 text-slate-400 dark:text-slate-500" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">تاريخ التوريدة</label>
                <input type="date" value={supplyDate} onChange={e => setSupplyDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-right" />
              </div>

              {/* Colors */}
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
                      <input type="number" placeholder="كمية (كجم)" value={col.quantity}
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

              {/* Total */}
              <div className="bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/50 rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-cyan-750 dark:text-cyan-400">إجمالي التوريدة:</span>
                <span className="text-lg font-black text-cyan-800 dark:text-cyan-300">
                  {totalSupply(supplyColors).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المبلغ المدفوع الآن (اختياري)</label>
                <input type="number" value={supplyPaid} onChange={e => setSupplyPaid(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-350 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 dark:bg-slate-800 text-emerald-650 dark:text-emerald-400 font-bold text-right" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={handleAddSupply} className="flex-1 bg-cyan-600 text-white py-2 rounded-lg font-bold hover:bg-cyan-700">
                <Save className="h-4 w-4 inline ml-1" /> حفظ التوريدة
              </button>
              <button onClick={() => setShowSupplyModal(false)}
                className="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-850 dark:text-white">تسجيل دفعة — {selectedSupplier.name}</h3>
              <button onClick={() => setShowPayModal(false)}><X className="h-5 w-5 text-slate-400 dark:text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المبلغ (ج.م)</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-350 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 dark:bg-slate-800 text-emerald-650 dark:text-emerald-400 font-bold text-right" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ملاحظة (اختياري)</label>
                <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-right" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAddPayment} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700">
                حفظ الدفعة
              </button>
              <button onClick={() => setShowPayModal(false)}
                className="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InkSuppliers;
