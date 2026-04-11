import React, { useState, useEffect } from 'react';
import { Shield, Key, ShieldCheck, Copy, CheckCircle } from 'lucide-react';
import { verifyLicense, saveLicense } from '../utils/licenseManager';

const Activation = ({ onActivated }) => {
  const [machineId, setMachineId] = useState('جاري القراءة...');
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // محاولة جلب معرّف الجهاز عبر واجهة Electron
    const fetchMachineId = async () => {
      try {
        if (window.electronAPI && window.electronAPI.getMachineId) {
          const id = await window.electronAPI.getMachineId();
          setMachineId(id);
        } else {
          // في حال التشغيل على المتصفح وليس Electron (للـ Development)
          setMachineId('DEV-MACHINE-1234');
        }
      } catch (err) {
        setMachineId('ERROR-FETCHING-ID');
      }
    };
    fetchMachineId();
  }, []);

  const handleCopy = () => {
    if (machineId && machineId.length > 5) {
      navigator.clipboard.writeText(machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleActivate = () => {
    setError('');
    
    if (!licenseKey) {
      setError('يرجى إدخال كود التفعيل.');
      return;
    }

    const isValid = verifyLicense(licenseKey, machineId);
    
    if (isValid) {
      saveLicense(licenseKey);
      onActivated();
    } else {
      setError('كود التفعيل غير صحيح أو لا يطابق هذا الجهاز.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      
      {/* خلفية تجميلية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-lg bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 shadow-2xl relative z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
            <Shield className="w-10 h-10" style={{ color: '#fff' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>تفعيل النظام</h1>
          <p className="text-center text-lg" style={{ color: '#fff' }}>
            أهلاً بك في Elking System. يرجى تفعيل النسخة الخاصة بك لتعمل على هذا الجهاز.
          </p>
        </div>

        <div className="space-y-6">
          
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
            <label className="block text-sm font-medium mb-2" style={{ color: '#fff' }}>معرّف الجهاز (أرسله للمطور):</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 block p-3 bg-slate-950 rounded-xl text-emerald-400 font-mono text-lg text-center selection:bg-emerald-900">
                {machineId}
              </code>
              <button 
                onClick={handleCopy}
                className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors shrink-0"
                title="نسخ المعرّف"
              >
                {copied ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#fff' }}>
              كود التفعيل:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5" style={{ color: '#fff' }} />
              </div>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                style={{ color: '#fff' }}
                className="w-full bg-slate-900/80 border border-slate-600 text-center font-mono text-lg rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-slate-500 uppercase tracking-widest"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
               <p className="text-red-400 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleActivate}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98]"
          >
            <ShieldCheck className="w-6 h-6" />
            تفعيل النظام الآن
          </button>
          
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-lg font-medium mb-1" style={{ color: '#fff' }}>
            يرجي التواصل مع المطور لشراء البرنامج او فتح الحظر
          </p>
          <div className="inline-block bg-white/10 px-6 py-3 rounded-full mt-2 border border-white/20">
            <p className="text-xl font-bold dir-ltr tracking-wider" style={{ color: '#fff' }}>
              01553448631
            </p>
          </div>
        </div>

      </div>
      
      <p className="mt-8 text-sm relative z-10 font-bold opacity-80" style={{ color: '#fff' }}>
        Elking Store Management System © 2026
      </p>
    </div>
  );
};

export default Activation;
