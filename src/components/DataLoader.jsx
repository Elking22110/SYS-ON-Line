import React, { useState, useEffect } from 'react';
import { DataValidator } from '../utils/dataValidation';

const DataLoader = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('جاري تحميل البيانات...');

  const [progress, setProgress] = useState({ name: '', percent: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingMessage('جاري التحقق من صحة البيانات...');
        
        // 1. التحقق من صحة البيانات المحلية
        const validation = DataValidator.validateStoredData();
        if (!validation.isValid) {
          setLoadingMessage('جاري إصلاح البيانات المتضررة...');
          DataValidator.repairData();
        }

        // 2. المزامنة الشاملة من السحابة (للأجهزة الجديدة أو لضمان التحديث)
        setLoadingMessage('جاري مزامنة البيانات من السحابة...');
        try {
          const supabaseService = (await import('../utils/supabaseService')).default;
          await supabaseService.bootstrapAllData((name, percent) => {
            setProgress({ name, percent });
            setLoadingMessage(`جاري مزامنة ${name}...`);
          });
        } catch (syncErr) {
          console.warn('Initial sync failed, falling back to local data:', syncErr);
        }

        setLoadingMessage('تم تحميل النظام وجاهز للعمل');
        setTimeout(() => setIsLoading(false), 500);
      } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        setLoadingMessage('عذراً، حدث خطأ أثناء تحميل البيانات');
        setTimeout(() => setIsLoading(false), 2000);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-blue-400 font-bold">{progress.percent}%</span>
            </div>
          </div>
          
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-black text-white tracking-tight">نظام الملك الرقمي</h2>
            <p className="text-slate-400 font-medium">{loadingMessage}</p>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
               <div 
                 className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-500 ease-out"
                 style={{ width: `${progress.percent}%` }}
               ></div>
            </div>
            
            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">
               <span>مزامنة السحابة</span>
               <span>{progress.name}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default DataLoader;




