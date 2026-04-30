import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Save, X, Droplets, DollarSign, ArrowRight, Package, Layers, ChevronDown, ChevronUp } from 'lucide-react';
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
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/ink-suppliers')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-cyan-600 font-bold transition-colors">
          <ArrowRight className="h-4 w-4" /> موردو الأحبار
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-bold text-slate-700">{supplier.name}</span>
      </div>

      {/* Supplier Info Card */}
      <div className="glass-card p-5">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Droplets className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">{supplier.name}</h1>
              <p className="text-sm text-slate-500">{supplier.phone} {supplier.email && `· ${supplier.email}`}</p>
              {supplier.address && <p className="text-xs text-slate-400 mt-0.5">{supplier.address}</p>}
            </div>
          </div>
          {/* Stats */}
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
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow">
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
          <Package className="h-5 w-5 text-cyan-600" />
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
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-1 rounded-full">{sup.supplyNumber}</span>
                    <span className="text-xs text-slate-400">{sup.date}</span>
                    <span className="text-xs font-bold text-slate-600">{sup.colors?.length} لون</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">{(sup.totalPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</p>
                      <p className="text-xs text-red-500">متبقي: {(sup.remainingAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</p>
                    </div>
                    <button onClick={() => setExpandedSupply(expandedSupply === sup.id ? null : sup.id)}
                      className="text-slate-400 hover:text-cyan-600 p-1">
                      {expandedSupply === sup.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button onClick={() => handleDeleteSupply(sup.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {expandedSupply === sup.id && (
                  <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-1.5">
                    {(sup.colors || sup.metadata?.colors)?.map((c, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block"></span>
                          <span className="font-bold text-slate-700">{c.color}</span>
                          {c.quantity && <span className="text-slate-400 text-xs">— {c.quantity} كجم × {c.cost} ج.م</span>}
                        </div>
                        <span className="font-black text-slate-800">{safeMath.multiply(c.cost || 0, c.quantity || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 text-xs font-bold text-emerald-600">
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">إضافة توريدة أحبار</h3>
              <button onClick={() => setShowSupplyModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">التاريخ</label>
                <input type="date" value={supplyDate} onChange={e => setSupplyDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-slate-50" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700">الألوان والتكاليف</label>
                  <button onClick={() => setSupplyColors([...supplyColors, emptyColor()])}
                    className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-lg font-bold hover:bg-cyan-200 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> إضافة لون
                  </button>
                </div>
                <div className="space-y-2">
                  {supplyColors.map((col, idx) => (
                    <div key={col.id} className="flex gap-2 items-center bg-slate-50 rounded-xl p-2 border border-slate-200">
                      <input placeholder="اسم اللون" value={col.color}
                        onChange={e => setSupplyColors(supplyColors.map((c, i) => i === idx ? { ...c, color: e.target.value } : c))}
                        className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white" />
                      <input type="number" placeholder="كمية كجم" value={col.quantity}
                        onChange={e => setSupplyColors(supplyColors.map((c, i) => i === idx ? { ...c, quantity: e.target.value } : c))}
                        className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white text-center" />
                      <input type="number" placeholder="سعر الكجم" value={col.cost}
                        onChange={e => setSupplyColors(supplyColors.map((c, i) => i === idx ? { ...c, cost: e.target.value } : c))}
                        className="w-28 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white text-center" />
                      {supplyColors.length > 1 && (
                        <button onClick={() => setSupplyColors(supplyColors.filter((_, i) => i !== idx))}
                          className="text-red-400 p-1"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex justify-between">
                <span className="text-sm font-bold text-cyan-700">إجمالي التوريدة:</span>
                <span className="text-lg font-black text-cyan-800">{totalSupply(supplyColors).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ المدفوع الآن (اختياري)</label>
                <input type="number" value={supplyPaid} onChange={e => setSupplyPaid(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAddSupply} className="flex-1 bg-cyan-600 text-white py-2 rounded-lg font-bold hover:bg-cyan-700">حفظ التوريدة</button>
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

export default InkSupplierDetails;
