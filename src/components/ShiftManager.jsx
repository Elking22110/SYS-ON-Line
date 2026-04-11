import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Receipt,
  Trash2
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import { formatDate, formatTimeOnly, formatDateOnly, formatDateTime, getCurrentDate } from '../utils/dateUtils.js';
import { getNextShiftId } from '../utils/sequence.js';
import safeMath from '../utils/safeMath.js';
import supabaseService from '../utils/supabaseService';

const ShiftManager = () => {
  const [shifts, setShifts] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // تفاصيل الوردية النشطة لحظياً
  const { activeDetails, activeSalesList, activeProductionOrders, activePayments } = useMemo(() => {
    try {
      if (!currentShift) return { activeDetails: null, activeSalesList: [], activeProductionOrders: [], activePayments: [] };
      
      const allSales = JSON.parse(localStorage.getItem('sales') || '[]');
      const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
      const allPayments = JSON.parse(localStorage.getItem('customer_payments') || '[]');
      const allExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      
      // Filter by shift ID
      const salesList = allSales.filter(s => s.shiftId === currentShift.id);
      const ordersList = allOrders.filter(o => o.status === 'CLOSED' && o.shiftId === currentShift.id);
      const paymentsList = allPayments.filter(p => p.shiftId === currentShift.id);
      const expensesList = allExpenses.filter(e => e.shiftId === currentShift.id);
      
      return { 
        activeDetails: calculateSalesDetails(salesList, ordersList, paymentsList, expensesList), 
        activeSalesList: salesList,
        activeProductionOrders: ordersList,
        activePayments: paymentsList
      };
    } catch (_) { 
      return { activeDetails: null, activeSalesList: [], activeProductionOrders: [], activePayments: [] }; 
    }
  }, [currentShift]);

  const loadShifts = async () => {
    try {
      setIsLoading(true);

      // 1. تحميل البيانات المحلية وعرضها فوراً (Optimistic UI)
      const localShifts = JSON.parse(localStorage.getItem('shifts') || '[]');
      if (localShifts && localShifts.length > 0) {
        setShifts(localShifts);
        const activeLocal = localShifts.find(s => s.status === 'active');
        if (activeLocal) {
          setCurrentShift(activeLocal);
        }
      }

      // 2. المزامنة في الخلفية
      const onlineShifts = await supabaseService.getShifts();

      const combined = [...localShifts, ...(onlineShifts || [])];

      // إزالة التكرار مع إعطاء الأولوية للبيانات الأحدث/الأونلاين عبر دمجها بشكل صحيح
      const shiftMap = new Map();
      combined.forEach(shift => {
        const existing = shiftMap.get(shift.id);
        // إذا كان موجود واكتمل، نأخذ المكتمل. وإلا نحدثه.
        if (!existing || shift.status === 'completed') {
          shiftMap.set(shift.id, shift);
        }
      });

      const uniqueShifts = Array.from(shiftMap.values());

      setShifts(uniqueShifts);
      localStorage.setItem('shifts', JSON.stringify(uniqueShifts));

      // تحميل الوردية النشطة
      const active = uniqueShifts.find(s => s.status === 'active');
      if (active) {
        setCurrentShift(active);
        localStorage.setItem('activeShift', JSON.stringify(active));
      } else {
        localStorage.removeItem('activeShift');
        setCurrentShift(null);
      }
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();

    const reload = () => loadShifts();
    const onDataUpdated = (e) => {
      if (!e || !e.detail || !e.detail.type) { reload(); return; }
      if (e.detail.type === 'shift' || e.detail.type === 'sales') reload();
    };

    window.addEventListener('dataUpdated', onDataUpdated);
    window.addEventListener('shiftStarted', reload);
    window.addEventListener('shiftEnded', reload);
    const unsubscribe = typeof subscribe === 'function' ? subscribe(EVENTS.SHIFTS_CHANGED, reload) : null;

    return () => {
      window.removeEventListener('dataUpdated', onDataUpdated);
      window.removeEventListener('shiftStarted', reload);
      window.removeEventListener('shiftEnded', reload);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // بدء وردية جديدة
  const startShift = async () => {
    const now = new Date();
    const shiftId = getNextShiftId();
    const newShift = {
      id: shiftId,
      userId: JSON.parse(localStorage.getItem('user') || '{}').id || null,
      userName: JSON.parse(localStorage.getItem('user') || '{}').username || 'مستخدم',
      startTime: getCurrentDate(),
      endTime: null,
      status: 'active',
      sales: [],
      totalSales: 0,
      totalOrders: 0,
      startBalance: 0,
      endBalance: 0,
      notes: ''
    };

    // 1. حفظ محلياً أولاً
    const updatedShifts = [...shifts, newShift];
    setShifts(updatedShifts);
    localStorage.setItem('shifts', JSON.stringify(updatedShifts));

    setCurrentShift(newShift);
    localStorage.setItem('activeShift', JSON.stringify(newShift));
    publish(EVENTS.SHIFTS_CHANGED, { type: 'start', shift: newShift });
    window.dispatchEvent(new CustomEvent('shiftStarted', { detail: { shiftId: newShift.id } }));

    soundManager.play('startShift');

    // 2. مزامنة مع Supabase
    try {
      await supabaseService.startShift({
        id: newShift.id,
        startTime: newShift.startTime,
        startBalance: 0,
        status: 'active',
        userId: newShift.userId
      });
      setMessage('تم بدء الوردية بنجاح!');
    } catch (error) {
      console.error('Failed to sync start shift to Supabase:', error);
      setMessage('بدأت الوردية محلياً (سيتم المزامنة لاحقاً)');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  // إنهاء الوردية
  const endShift = async () => {
    if (!currentShift) return;

    const now = new Date();
    const allSales = JSON.parse(localStorage.getItem('sales') || '[]');
    const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
    const allPayments = JSON.parse(localStorage.getItem('customer_payments') || '[]');
    const allExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');

    const shiftSales = allSales.filter(s => s.shiftId === currentShift.id);
    const shiftOrders = allOrders.filter(o => o.status === 'CLOSED' && o.shiftId === currentShift.id);
    const shiftPayments = allPayments.filter(p => p.shiftId === currentShift.id);
    const shiftExpenses = allExpenses.filter(e => e.shiftId === currentShift.id);

    const salesDetails = calculateSalesDetails(shiftSales, shiftOrders, shiftPayments, shiftExpenses);

    const updatedShift = {
      ...currentShift,
      sales: shiftSales,
      endTime: now.toISOString(),
      status: 'completed',
      endBalance: safeMath.subtract(safeMath.add(currentShift.startBalance || 0, salesDetails.totalReceived), salesDetails.totalRefunds)
    };

    // 1. حفظ محلياً أولاً (حتى لو فشل الاتصال بالسيرفر)
    const existingShiftIndex = shifts.findIndex(shift => shift.id === updatedShift.id);
    let updatedShifts = existingShiftIndex !== -1
      ? shifts.map((s, i) => i === existingShiftIndex ? updatedShift : s)
      : [...shifts, updatedShift];

    setShifts(updatedShifts);
    setCurrentShift(null);
    localStorage.setItem('shifts', JSON.stringify(updatedShifts));
    localStorage.removeItem('activeShift');

    publish(EVENTS.SHIFTS_CHANGED, { type: 'end', shift: updatedShift });
    window.dispatchEvent(new CustomEvent('shiftEnded', { detail: { shiftId: updatedShift.id } }));

    soundManager.play('endShift');
    showShiftReport(updatedShift);

    // 2. مزامنة مع Supabase
    try {
      await supabaseService.endShift(updatedShift.id, {
        endTime: updatedShift.endTime,
        status: 'completed',
        endBalance: updatedShift.endBalance
      });
      setMessage('تم إنهاء الوردية بنجاح!');
    } catch (error) {
      console.error('Failed to sync end shift to Supabase:', error);
      setMessage('تم إنهاء الوردية محلياً (سيتم المزامنة لاحقاً)');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  // حساب تفاصيل المبيعات (نظام مصنع متكامل)
  const calculateSalesDetails = (sales = [], productionOrders = [], customerPayments = [], expenses = []) => {
    let totalSales = 0;
    let totalReceived = 0;
    let totalRemaining = 0;
    let totalRefunds = 0;
    let totalDiscounts = 0;
    let completeInvoices = 0;
    let partialInvoices = 0;
    let refundInvoices = 0;
    let discountInvoices = 0;

    // المبالغ الخاصة بالمبيعات المباشرة (POS)
    const paymentMethods = {
      'نقدي': { received: 0, remaining: 0, count: 0 },
      'محفظة إلكترونية': { received: 0, remaining: 0, count: 0 },
      'انستا باي': { received: 0, remaining: 0, count: 0 },
      'مرتجع': { received: 0, remaining: 0, count: 0 }
    };

    // 1. حساب مبيعات الـ POS
    (sales || []).forEach(sale => {
      const saleTotal = Number(sale.total) || 0;
      let refundAmount = 0;
      const explicitRefund = sale.type === 'refund' || sale.isRefund === true;
      if (explicitRefund) refundAmount = Math.abs(saleTotal);
      if (saleTotal < 0) refundAmount = Math.max(refundAmount, Math.abs(saleTotal));

      if (refundAmount > 0) {
        totalRefunds = safeMath.add(totalRefunds, refundAmount);
        refundInvoices++;
        if (paymentMethods['مرتجع']) {
          paymentMethods['مرتجع'].received += refundAmount;
          paymentMethods['مرتجع'].count++;
        }
        return;
      }

      totalSales += saleTotal;
      const paymentMethod = sale.paymentMethod || 'نقدي';
      if (!paymentMethods[paymentMethod]) paymentMethods[paymentMethod] = { received: 0, remaining: 0, count: 0 };

      if (sale.discount && sale.discount.amount > 0) {
        totalDiscounts = safeMath.add(totalDiscounts, sale.discount.amount);
        discountInvoices++;
      }

      if (sale.downPayment && sale.downPayment.enabled) {
        const receivedAmount = sale.downPayment.amount;
        const remainingAmount = sale.downPayment.remaining || safeMath.subtract(sale.total, sale.downPayment.amount);
        totalReceived = safeMath.add(totalReceived, receivedAmount);
        totalRemaining = safeMath.add(totalRemaining, remainingAmount);
        partialInvoices++;
        paymentMethods[paymentMethod].received = safeMath.add(paymentMethods[paymentMethod].received, receivedAmount);
        paymentMethods[paymentMethod].remaining = safeMath.add(paymentMethods[paymentMethod].remaining, remainingAmount);
        paymentMethods[paymentMethod].count++;
      } else {
        totalReceived = safeMath.add(totalReceived, sale.total);
        completeInvoices++;
        paymentMethods[paymentMethod].received = safeMath.add(paymentMethods[paymentMethod].received, sale.total);
        paymentMethods[paymentMethod].count++;
      }
    });

    // 2. إضافة مبيعات المصنع (Customer Orders)
    (productionOrders || []).forEach(order => {
      const orderTotal = Number(order.totalPrice) || 0;
      totalSales = safeMath.add(totalSales, orderTotal);
      // الطلبات المغلقة تُعتبر مبيعات تامة، ولكن التحصيل الفعلي يتم عبر Payments
      // في نظام المصنع، المديونية هي الأساس، لذا نعتبرها Remaining حتى يتم دفعها
      totalRemaining = safeMath.add(totalRemaining, orderTotal);
    });

    // 3. إضافة المدفوعات النقدية (Customer Payments / Settlements)
    (customerPayments || []).forEach(pay => {
      const payAmount = Number(pay.amount) || 0;
      totalReceived = safeMath.add(totalReceived, payAmount);
      // المدفوعات تقلل المديونية الكلية الظاهرة في الوردية
      totalRemaining = safeMath.subtract(totalRemaining, payAmount);
      
      const method = pay.method === 'CASH' ? 'نقدي' : (pay.method === 'WALLET' ? 'محفظة إلكترونية' : 'نقدي');
      if (!paymentMethods[method]) paymentMethods[method] = { received: 0, remaining: 0, count: 0 };
      paymentMethods[method].received = safeMath.add(paymentMethods[method].received, payAmount);
      paymentMethods[method].count++;
    });

    // 4. خصم المصروفات (اختياري للعرض فقط هنا ولكن يؤثر على الصندوق)
    let totalExpenses = (expenses || []).reduce((sum, exp) => safeMath.add(sum, Number(exp.amount) || 0), 0);

    const activePaymentMethods = Object.entries(paymentMethods)
      .filter(([method, data]) => data.received > 0 || data.remaining > 0 || data.count > 0)
      .reduce((acc, [method, data]) => {
        acc[method] = data;
        return acc;
      }, {});

    return {
      totalSales,
      totalReceived,
      totalRemaining,
      totalRefunds,
      totalDiscounts,
      totalExpenses,
      completeInvoices,
      partialInvoices,
      refundInvoices,
      discountInvoices,
      productionOrdersCount: (productionOrders || []).length,
      posSalesCount: (sales || []).length,
      totalInvoices: (sales || []).length + (productionOrders || []).length,
      paymentMethods: activePaymentMethods
    };
  };

  // عرض تقرير الوردية
  const showShiftReport = (shift) => {
    try {
      // التأكد من وجود بيانات الوردية
      if (!shift) {
        setMessage('لا توجد بيانات للوردية');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      // 1. تجميع البيانات الأساسية للنطاق الزمني للوردية
      const shiftStart = new Date(shift.startTime).getTime();
      const shiftEnd = new Date(shift.endTime || Date.now()).getTime();
      const allOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
      const allPayments = JSON.parse(localStorage.getItem('customer_payments') || '[]');
      const allExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      const allSales = JSON.parse(localStorage.getItem('sales') || '[]');
      const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
      const allSupplierPayments = JSON.parse(localStorage.getItem('supplier_payments') || '[]');

      // فحص مبيعات الـ POS
      const salesForShift = (shift.sales && shift.sales.length > 0)
        ? shift.sales
        : allSales.filter(s => {
          if (s.shiftId && s.shiftId === shift.id) return true;
          const ts = new Date(s.timestamp || s.date || 0).getTime();
          return ts >= shiftStart && ts <= shiftEnd;
        });

      // فحص طلبات الإنتاج المغلقة
      const closedOrdersInShift = allOrders.filter(order => {
        if (order.status !== 'CLOSED') return false;
        if (order.shiftId && order.shiftId === shift.id) return true;
        const closedAt = new Date(order.closedAt || order.date || 0).getTime();
        return closedAt >= shiftStart && closedAt <= shiftEnd;
      });

      // فحص تحصيلات العملاء (الدفعيات)
      const customerPaymentsInShift = allPayments.filter(p => {
        if (p.shiftId && p.shiftId === shift.id) return true;
        const ts = new Date(p.date || 0).getTime();
        return ts >= shiftStart && ts <= shiftEnd;
      });

      // فحص المصاريف
      const expensesInShift = allExpenses.filter(exp => {
        if (exp.shiftId && exp.shiftId === shift.id) return true;
        const ts = new Date(exp.date || 0).getTime();
        return ts >= shiftStart && ts <= shiftEnd;
      });

      // فحص مدفوعات الموردين (المسجلة في هذا الوقت)
      const supplierPaymentsInShift = allSupplierPayments.filter(p => {
        if (p.shiftId && p.shiftId === shift.id) return true;
        const ts = new Date(p.date || 0).getTime();
        return ts >= shiftStart && ts <= shiftEnd;
      });

      // 2. حساب تفاصيل المبيعات المجمعة (تمرير كافة المكونات)
      const salesDetails = calculateSalesDetails(
        salesForShift, 
        closedOrdersInShift, 
        customerPaymentsInShift, 
        expensesInShift
      );

      // التحقق من صحة البيانات
      console.log('🔍 فحص بيانات التقرير:', {
        sales: shift.sales?.length || 0,
        salesDetails,
        cashDrawer: shift.cashDrawer
      });

      // التحقق من منطق الحساب
      const calculatedTotal = salesDetails.totalReceived + salesDetails.totalRemaining;
      const expectedTotal = salesDetails.totalSales - salesDetails.totalRefunds;
      const calculationError = Math.abs(calculatedTotal - expectedTotal);

      if (calculationError > 0.01) { // خطأ أكبر من قرش واحد
        console.warn('⚠️ خطأ في الحساب:', {
          calculatedTotal,
          expectedTotal,
          error: calculationError
        });
      }

      // 3. حساب تكاليف الموردين (المواد الخام للطلبات المغلقة في هذه الوردية)
      const materialCostForClosedOrders = closedOrdersInShift.reduce((sum, order) => {
        const linkedSupplies = allSupplies.filter(s => s.linkedOrderId?.toString() === order.id?.toString());
        return sum + linkedSupplies.reduce((sub, s) => sub + (Number(s.totalPrice) || 0), 0);
      }, 0);

      const supplierTotals = {
        totalCost: materialCostForClosedOrders, 
        totalPaid: supplierPaymentsInShift.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        count: supplierPaymentsInShift.length
      };

      const customerTotals = {
        ordersCount: closedOrdersInShift.length,
        paymentsReceived: customerPaymentsInShift.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
        newDebt: closedOrdersInShift.reduce((s, o) => s + ((Number(o.totalPrice) || 0) - (Number(o.paidAmount) || 0)), 0)
      };

      // 4. صافي الربح والسيولة
      const netProfit = salesDetails.totalSales - supplierTotals.totalCost - salesDetails.totalExpenses;
      const openingBalance = parseFloat(shift.cashDrawer?.openingAmount) || 0;
      const actualReceivedCash = salesDetails.totalReceived; // مجمع (POS + Payments)
      const expectedCashDrawer = openingBalance + actualReceivedCash - supplierTotals.totalPaid - salesDetails.totalExpenses;

      const reportWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');

      if (!reportWindow) {
        soundManager.play('error');
        setMessage('يرجى السماح بالنوافذ المنبثقة لعرض التقرير');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      const reportHTML = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تقرير الوردية المبسط - ${shift.id}</title>
            <style>
              body { font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; background: #f0f2f5; direction: rtl; }
              .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; }
              .header { background: #1e3c72; color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
              .card { padding: 20px; border-radius: 12px; border: 1px solid #e1e4e8; background: #fff; }
              .card h3 { margin: 0 0 10px 0; color: #5f6368; font-size: 14px; }
              .card .val { font-size: 24px; font-weight: 700; color: #202124; }
              .section { margin-bottom: 25px; padding: 20px; border-radius: 12px; background: #f8f9fa; border-right: 5px solid #1e3c72; }
              .section h2 { margin: 0 0 15px 0; font-size: 18px; color: #1a73e8; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .total-box { background: #e8f0fe; padding: 20px; border-radius: 12px; text-align: center; margin-top: 20px; }
              .btn-print { display: block; width: 100%; padding: 15px; background: #1a73e8; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 20px; }
              @media print { .btn-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 تقرير الوردية الملخص</h1>
                <p>${shift.userName} | ${new Date(shift.startTime).toLocaleString('ar-EG')} - ${new Date(shift.endTime || Date.now()).toLocaleString('ar-EG')}</p>
              </div>
              <div class="content">
                <div class="grid">
                  <div class="card" style="border-top: 4px solid #1a73e8;">
                    <h3>💰 إجمالي الإيرادات (مجمع)</h3>
                    <div class="val">${salesDetails.totalSales.toFixed(2)} ج.م</div>
                  </div>
                  <div class="card" style="border-top: 4px solid #34a853;">
                    <h3>🛍️ عدد الأوردرات</h3>
                    <div class="val">${salesDetails.totalInvoices}</div>
                  </div>
                  <div class="card" style="border-top: 4px solid #fbbc04;">
                    <h3>💵 مبالغ مستلمة (نقدية)</h3>
                    <div class="val">${actualReceivedCash.toFixed(2)} ج.م</div>
                  </div>
                  <div class="card" style="border-top: 4px solid #ea4335;">
                    <h3>📉 فلوس بره (مديونيات جديدة)</h3>
                    <div class="val">${salesDetails.totalRemaining.toFixed(2)} ج.م</div>
                  </div>
                </div>

                <div class="section">
                  <h2>🚚 تفاصيل الموردين</h2>
                  <div class="row"><span>إجمالي تكلفة الخامات (للطلبات المغلقة):</span> <strong>${supplierTotals.totalCost.toFixed(2)} ج.م</strong></div>
                  <div class="row"><span>المدفوع للموردين في هذه الوردية:</span> <strong>${supplierTotals.totalPaid.toFixed(2)} ج.م</strong></div>
                </div>

                <div class="section">
                  <h2>👥 تفاصيل العملاء</h2>
                  <div class="row"><span>أوردرات إنتاج مغلقة:</span> <strong>${customerTotals.ordersCount} أوردر</strong></div>
                  <div class="row"><span>تحصيلات نقدية من العملاء:</span> <strong>${customerTotals.paymentsReceived.toFixed(2)} ج.م</strong></div>
                </div>

                <div class="section">
                  <h2>💸 المصاريف والربح</h2>
                  <div class="row"><span>إجمالي المصروفات والنثريات:</span> <strong>${salesDetails.totalExpenses.toFixed(2)} ج.م</strong></div>
                  <div class="row"><span>صافي الربح التقديري:</span> <strong style="color: #34a853;">${netProfit.toFixed(2)} ج.م</strong></div>
                </div>

                <div class="total-box">
                  <h3 style="margin-bottom: 5px;">🏦 رصيد الصندوق المتوقع</h3>
                  <div style="font-size: 32px; font-weight: 900; color: #1e3c72;">${expectedCashDrawer.toFixed(2)} ج.م</div>
                  <p style="font-size: 12px; color: #5f6368; margin-top: 10px;">(البداية: ${openingBalance} + تحصيل: ${actualReceivedCash} - دفع للموردين: ${supplierTotals.totalPaid} - مصاريف: ${salesDetails.totalExpenses})</p>
                </div>

                <button class="btn-print" onclick="window.print()">طباعة التقرير 🖨️</button>
              </div>
            </div>
          </body>
          </html>
      `;

            ${Object.keys(salesDetails.paymentMethods || {}).length > 0 ? `
            <div class="details-section">
              <h2>💳 تقسيم المبالغ حسب طرق الدفع</h2>
              <table class="details-table">
                <thead>
                  <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <th style="padding: 15px; text-align: right; font-weight: 600;">طريقة الدفع</th>
                    <th style="padding: 15px; text-align: center; font-weight: 600;">المبلغ المستلم</th>
                    <th style="padding: 15px; text-align: center; font-weight: 600;">المبلغ المتبقي</th>
                    <th style="padding: 15px; text-align: center; font-weight: 600;">عدد الفواتير</th>
                    <th style="padding: 15px; text-align: center; font-weight: 600;">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(salesDetails.paymentMethods || {}).map(([method, data]) => {
            const total = data.received + data.remaining;
            const methodIcon = method === 'نقدي' ? '💵' :
              method === 'محفظة إلكترونية' ? '📱' :
                method === 'انستا باي' ? '💳' :
                  method === 'مرتجع' ? '🔄' : '💰';
            const methodColor = method === 'نقدي' ? '#38a169' :
              method === 'محفظة إلكترونية' ? '#3182ce' :
                method === 'انستا باي' ? '#9f7aea' :
                  method === 'مرتجع' ? '#e53e3e' : '#666';

            return `
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px; font-weight: 600; color: ${methodColor};">
                          ${methodIcon} ${method}
                        </td>
                        <td style="padding: 12px; text-align: center; font-weight: 600; color: #38a169;">
                          ${(data.received || 0).toFixed(2)} جنيه
                        </td>
                        <td style="padding: 12px; text-align: center; font-weight: 600; color: #d69e2e;">
                          ${(data.remaining || 0).toFixed(2)} جنيه
                        </td>
                        <td style="padding: 12px; text-align: center; font-weight: 600; color: #3182ce;">
                          ${data.count} فاتورة
                        </td>
                        <td style="padding: 12px; text-align: center; font-weight: 700; color: ${methodColor}; background: ${methodColor}15; border-radius: 8px;">
                          ${(total || 0).toFixed(2)} جنيه
                        </td>
                      </tr>
                    `;
          }).join('')}
                </tbody>
                <tfoot>
                  <tr style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9;">
                    <td style="padding: 15px; font-weight: 700; color: #0ea5e9; font-size: 16px;">
                      📊 المجموع الكلي
                    </td>
                    <td style="padding: 15px; text-align: center; font-weight: 700; color: #38a169; font-size: 16px;">
                      ${(salesDetails.totalReceived || 0).toFixed(2)} جنيه
                    </td>
                    <td style="padding: 15px; text-align: center; font-weight: 700; color: #d69e2e; font-size: 16px;">
                      ${(salesDetails.totalRemaining || 0).toFixed(2)} جنيه
                    </td>
                    <td style="padding: 15px; text-align: center; font-weight: 700; color: #3182ce; font-size: 16px;">
                      ${salesDetails.totalInvoices} فاتورة
                    </td>
                    <td style="padding: 15px; text-align: center; font-weight: 700; color: #0ea5e9; font-size: 18px; background: #0ea5e920; border-radius: 8px;">
                      ${((salesDetails.totalReceived || 0) + (salesDetails.totalRemaining || 0)).toFixed(2)} جنيه
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            ` : ''}

            <div class="details-section">
              <h2>🧮 التحقق من الحسابات</h2>
              <table class="details-table">
                <tr>
                  <td><strong>💰 إجمالي المبيعات</strong></td>
                  <td><span class="highlight">${salesDetails.totalSales.toFixed(2)} جنيه</span></td>
                </tr>
                <tr>
                  <td><strong>💵 المبلغ المستلم</strong></td>
                  <td><span class="highlight">${(salesDetails.totalReceived || 0).toFixed(2)} جنيه</span></td>
                </tr>
                <tr>
                  <td><strong>⏳ المبلغ المتبقي</strong></td>
                  <td><span class="highlight">${(salesDetails.totalRemaining || 0).toFixed(2)} جنيه</span></td>
                </tr>
                <tr>
                  <td><strong>🔄 إجمالي المرتجعات</strong></td>
                  <td><span class="highlight" style="color: #e53e3e;">-${(salesDetails.totalRefunds || 0).toFixed(2)} جنيه</span></td>
                </tr>
                <tr style="background: #f0f9ff; border: 2px solid #0ea5e9;">
                  <td><strong>✅ المجموع المحسوب</strong></td>
                  <td><span class="highlight" style="color: #0ea5e9; font-size: 16px; font-weight: 700;">${((salesDetails.totalReceived || 0) + (salesDetails.totalRemaining || 0)).toFixed(2)} جنيه</span></td>
                </tr>
                <tr style="background: #f0fdf4; border: 2px solid #22c55e;">
                  <td><strong>✅ المجموع المتوقع</strong></td>
                  <td><span class="highlight" style="color: #22c55e; font-size: 16px; font-weight: 700;">${((salesDetails.totalSales || 0) - (salesDetails.totalRefunds || 0)).toFixed(2)} جنيه</span></td>
                </tr>
                <tr style="background: ${Math.abs(((salesDetails.totalReceived || 0) + (salesDetails.totalRemaining || 0)) - ((salesDetails.totalSales || 0) - (salesDetails.totalRefunds || 0))) <= 0.01 ? '#f0fdf4' : '#fef2f2'}; border: 2px solid ${Math.abs(((salesDetails.totalReceived || 0) + (salesDetails.totalRemaining || 0)) - ((salesDetails.totalSales || 0) - (salesDetails.totalRefunds || 0))) <= 0.01 ? '#22c55e' : '#ef4444'};">
                  <td><strong>${Math.abs(((salesDetails.totalReceived || 0) + (salesDetails.totalRemaining || 0)) - ((salesDetails.totalSales || 0) - (salesDetails.totalRefunds || 0))) <= 0.01 ? '✅' : '❌'} حالة الحساب</strong></td>
                  <td><span class="highlight" style="color: ${Math.abs(((salesDetails.totalReceived || 0) + (salesDetails.totalRemaining || 0)) - ((salesDetails.totalSales || 0) - (salesDetails.totalRefunds || 0))) <= 0.01 ? '#22c55e' : '#ef4444'}; font-size: 16px; font-weight: 700;">${Math.abs(((salesDetails.totalReceived || 0) + (salesDetails.totalRemaining || 0)) - ((salesDetails.totalSales || 0) - (salesDetails.totalRefunds || 0))) <= 0.01 ? 'صحيح' : 'يحتاج مراجعة'}</span></td>
                </tr>
              </table>
            </div>

            ${shift.notes ? `
              <div class="details-section">
                <h2>📝 ملاحظات الوردية</h2>
                <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 20px; border-radius: 10px; border-right: 4px solid #3182ce; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #2d3748;">${shift.notes}</p>
                </div>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <button class="print-btn" onclick="window.print()">🖨️ طباعة التقرير</button>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>📅 تم إنشاء التقرير في:</strong> ${formatDateTime(getCurrentDate())}</p>
            <p><strong>🏪 Elking</strong> - </p>
            <p style="margin-top: 10px; font-size: 12px; opacity: 0.7;">جميع المبالغ بالجنيه المصري (EGP)</p>
          </div>
        </div>
      </body>
      </html>
    `;

      // كتابة المحتوى في النافذة
      reportWindow.document.open();
      reportWindow.document.write(reportHTML);
      reportWindow.document.close();

      // التأكد من تحميل المحتوى
      reportWindow.onload = () => {
        console.log('✅ تم تحميل التقرير بنجاح');
      };

      setMessage(`تم فتح تقرير وردية ${shift.userName} بنجاح!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('خطأ في عرض التقرير:', error);
      setMessage(`حدث خطأ أثناء فتح التقرير: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // تحديث مبلغ الصندوق
  const updateCashDrawer = (amount) => {
    if (!currentShift) return;

    const updatedShift = {
      ...currentShift,
      cashDrawer: {
        ...(currentShift.cashDrawer || {}),
        openingAmount: parseFloat(amount) || 0
      }
    };

    setCurrentShift(updatedShift);
    localStorage.setItem('activeShift', JSON.stringify(updatedShift));
    try { publish(EVENTS.SHIFTS_CHANGED, { type: 'update', field: 'cashDrawer', shift: updatedShift }); } catch (_) { }
  };

  // إضافة عملية بيع للوردية
  const addSaleToShift = (saleData) => {
    if (!currentShift) return;

    const updatedShift = {
      ...currentShift,
      sales: [...currentShift.sales, saleData],
      totalSales: currentShift.totalSales + saleData.total,
      totalOrders: currentShift.totalOrders + 1
    };

    setCurrentShift(updatedShift);
    localStorage.setItem('activeShift', JSON.stringify(updatedShift));
    try { publish(EVENTS.SHIFTS_CHANGED, { type: 'sale:add', shift: updatedShift }); } catch (_) { }
  };

  // تحديث ملاحظات الوردية
  const updateShiftNotes = (notes) => {
    if (!currentShift) return;

    const updatedShift = {
      ...currentShift,
      notes: notes
    };

    setCurrentShift(updatedShift);
    localStorage.setItem('activeShift', JSON.stringify(updatedShift));
    try { publish(EVENTS.SHIFTS_CHANGED, { type: 'update', field: 'notes', shift: updatedShift }); } catch (_) { }
  };

  // حذف وردية
  const deleteShift = async (shiftId) => {
    try {
      const shiftToDelete = shifts.find(shift => shift.id === shiftId);

      // حذف من قاعدة البيانات أيضاً
      try {
        const databaseManager = (await import('../utils/database')).default;
        await databaseManager.delete('shifts', shiftId);
        console.log('✅ تم حذف الوردية من قاعدة البيانات');
      } catch (error) {
        console.error('خطأ في حذف الوردية من قاعدة البيانات:', error);
      }

      const updatedShifts = shifts.filter(shift => shift.id !== shiftId);
      setShifts(updatedShifts);
      localStorage.setItem('shifts', JSON.stringify(updatedShifts));
      try { publish(EVENTS.SHIFTS_CHANGED, { type: 'delete', shiftId, shifts: updatedShifts }); } catch (_) { }

      soundManager.play('delete'); // تشغيل صوت الحذف
      setMessage(`تم حذف وردية ${shiftToDelete?.userName || 'غير محدد'} بنجاح!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('خطأ في حذف الوردية:', error);
      setMessage('حدث خطأ أثناء حذف الوردية');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // تصدير تقرير الورديات
  const exportShiftsReport = () => {
    const csvContent = [
      ['تاريخ البداية', 'تاريخ النهاية', 'المستخدم', 'إجمالي المبيعات', 'عدد الطلبات', 'مبلغ الصندوق', 'الحالة'],
      ...shifts.map(shift => [
        formatDateTime(shift.startTime),
        shift.endTime ? formatDateTime(shift.endTime) : 'لم تنته',
        shift.userName,
        (shift.totalSales || 0).toFixed(2),
        shift.totalOrders,
        (shift.cashDrawer?.closingAmount || 0).toFixed(2),
        shift.status === 'active' ? 'نشطة' : 'مكتملة'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shifts_report_${getCurrentDate().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
          <Clock className="h-6 w-6 text-slate-800" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">إدارة الورديات</h2>
          <p className="text-slate-600 text-sm">إدارة ورديات العمل والمبيعات</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('نجح') ? 'bg-green-500 bg-opacity-20 text-green-300' : 'bg-red-500 bg-opacity-20 text-red-300'
          }`}>
          {message}
        </div>
      )}

      {/* الوردية النشطة */}
      {currentShift ? (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <Play className="h-5 w-5 text-green-400 mr-2" />
              وردية نشطة
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => { soundManager.play('endShift'); endShift(); }}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-slate-800 rounded-lg transition-colors"
              >
                <Square className="h-4 w-4" />
                <span>إنهاء الوردية</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-600">وقت البداية</span>
              </div>
              <p className="text-slate-800 font-semibold">
                {formatDateTime(currentShift.startTime)}
              </p>
            </div>

            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="text-sm text-slate-600">إجمالي المبيعات</span>
              </div>
              <p className="text-slate-800 font-semibold">${(((activeDetails?.totalSales || 0) - (activeDetails?.totalRefunds || 0)) || 0).toFixed(2)}</p>
            </div>

            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-slate-600">عدد الطلبات</span>
              </div>
              <p className="text-slate-800 font-semibold">{activeDetails?.totalInvoices || 0}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                مبلغ الصندوق الافتتاحي
              </label>
              <input
                type="number"
                value={currentShift.cashDrawer?.openingAmount ?? ''}
                onChange={(e) => updateCashDrawer(e.target.value)}
                className="input-modern w-full"
                placeholder="0.00"
                step="any"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                ملاحظات الوردية
              </label>
              <textarea
                value={currentShift.notes}
                onChange={(e) => updateShiftNotes(e.target.value)}
                className="input-modern w-full h-20 resize-none"
                placeholder="أضف ملاحظات حول الوردية..."
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 text-center">
          <Clock className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">لا توجد وردية نشطة</h3>
          <p className="text-slate-600 mb-4">ابدأ وردية جديدة لبدء تتبع المبيعات</p>
          <button
            onClick={() => { soundManager.play('startShift'); startShift(); }}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-slate-800 rounded-lg transition-all mx-auto"
          >
            <Play className="h-5 w-5" />
            <span>بدء وردية جديدة</span>
          </button>
        </div>
      )}

      {/* تاريخ الورديات */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <Calendar className="h-5 w-5 text-blue-400 mr-2" />
            تاريخ الورديات
          </h3>
          <button
            onClick={() => { soundManager.play('save'); exportShiftsReport(); }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>تصدير التقرير</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-400">
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">التاريخ</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">المستخدم</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">المبيعات</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">الطلبات</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">الحالة</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-500">
                    لا توجد ورديات مسجلة
                  </td>
                </tr>
              ) : (
                shifts
                  .filter((shift, index, self) =>
                    // إزالة الورديات المكررة بناءً على المعرف
                    index === self.findIndex(s => s.id === shift.id)
                  )
                  .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                  .map((shift) => (
                    <tr key={shift.id} className="border-b border-slate-300 hover:bg-white hover:bg-opacity-5">
                      <td className="py-3 px-4 text-sm text-slate-800">
                        {formatDateOnly(shift.startTime)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-800">{shift.userName}</td>
                      <td className="py-3 px-4 text-sm text-green-400 font-semibold">
                        ${(shift.totalSales || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-800">{shift.totalOrders}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${shift.status === 'active'
                          ? 'bg-green-500 bg-opacity-20 text-green-300'
                          : 'bg-blue-500 bg-opacity-20 text-blue-300'
                          }`}>
                          {shift.status === 'active' ? 'نشطة' : 'مكتملة'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex space-x-2">
                          {shift.status === 'completed' && (
                            <button
                              onClick={() => { soundManager.play('openWindow'); showShiftReport(shift); }}
                              className="bg-blue-500 bg-opacity-10 hover:bg-opacity-30 text-blue-300 action-button hover:bg-blue-500"
                              title="عرض تقرير الوردية"
                            >
                              <Receipt />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              soundManager.play('warning');
                              if (window.confirm(`هل أنت متأكد من حذف وردية ${shift.userName} بتاريخ ${formatDateOnly(shift.startTime)}؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
                                deleteShift(shift.id);
                              }
                            }}
                            className="bg-red-500 bg-opacity-10 hover:bg-opacity-30 text-red-300 action-button hover:bg-red-500"
                            title="حذف الوردية"
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShiftManager;




