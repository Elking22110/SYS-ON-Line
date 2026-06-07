import React from 'react';
import { Store, Save, RefreshCw, Building, Phone, Mail, MapPin, Volume2, VolumeX, Settings2 } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine.js';

const StoreSettings = ({ settings, onSettingChange }) => {
  // If no props passed (standalone mode), fallback to local state is not needed anymore
  // as it's always used inside Settings.jsx in this system.
  
  if (!settings) return <div className="p-4 text-white">جاري تحميل الإعدادات...</div>;

  const handleInputChange = (field, value) => {
    // Map internal field names to parent settings names if they differ
    const mapping = {
      storeName: 'companyName',
      storePhone: 'companyPhone',
      storeAddress: 'companyAddress',
      storeEmail: 'companyEmail',
      // others are already named the same
    };
    
    const targetKey = mapping[field] || field;
    onSettingChange(targetKey, value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
          <Store className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">إعدادات المتجر</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">قم بتخصيص بيانات متجرك للفواتير والإيصالات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* معلومات أساسية */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Building className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">المعلومات الأساسية</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                اسم المصنع *
              </label>
              <input
                type="text"
                value={settings.companyName || ''}
                onChange={(e) => handleInputChange('storeName', e.target.value)}
                className="input-modern w-full"
                placeholder="أدخل اسم المصنع"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                وصف المتجر
              </label>
              <textarea
                value={settings.storeDescription || ''}
                onChange={(e) => handleInputChange('storeDescription', e.target.value)}
                className="input-modern w-full h-20 resize-none"
                placeholder="وصف مختصر عن المتجر"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                الرقم الضريبي
              </label>
              <input
                type="text"
                value={settings.storeTaxNumber || ''}
                onChange={(e) => handleInputChange('storeTaxNumber', e.target.value)}
                className="input-modern w-full"
                placeholder="الرقم الضريبي للمتجر"
              />
            </div>
          </div>
        </div>

        {/* معلومات الاتصال */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Phone className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">معلومات الاتصال</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                العنوان
              </label>
              <div className="relative">
                <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="text"
                  value={settings.companyAddress || ''}
                  onChange={(e) => handleInputChange('storeAddress', e.target.value)}
                  className="input-modern w-full pr-10"
                  placeholder="عنوان المتجر"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                رقم الهاتف
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="tel"
                  value={settings.companyPhone || ''}
                  onChange={(e) => handleInputChange('storePhone', e.target.value)}
                  className="input-modern w-full pr-10"
                  placeholder="رقم الهاتف"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="email"
                  value={settings.companyEmail || ''}
                  onChange={(e) => handleInputChange('storeEmail', e.target.value)}
                  className="input-modern w-full pr-10"
                  placeholder="البريد الإلكتروني"
                />
              </div>
            </div>
          </div>
        </div>

        {/* إعدادات الضرائب */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Building className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">إعدادات الضرائب</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">تفعيل الضريبة</label>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInputChange('taxEnabled', !settings.taxEnabled);
                }}
                className={`w-16 h-8 rounded-full transition-all duration-200 cursor-pointer ${settings.taxEnabled ? 'bg-green-500' : 'bg-gray-500'}`}
                style={{
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative',
                  minWidth: '64px',
                  minHeight: '32px'
                }}
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-all duration-200 ${settings.taxEnabled ? 'translate-x-8' : 'translate-x-1'}`}></div>
              </button>
            </div>

            {settings.taxEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">اسم الضريبة</label>
                  <input
                    type="text"
                    value={settings.taxName || ''}
                    onChange={(e) => handleInputChange('taxName', e.target.value)}
                    className="input-modern w-full"
                    placeholder="ضريبة القيمة المضافة"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">نسبة الضريبة (%)</label>
                  <input
                    type="number"
                    value={settings.taxRate || 0}
                    onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                    className="input-modern w-full"
                    placeholder="15"
                    min="0"
                    max="100"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* إعدادات النظام والأصوات */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Settings2 className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">إعدادات النظام</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-all">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${!soundEngine.isMuted ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  {!soundEngine.isMuted ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block text-right">أصوات النظام</label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-right">تفعيل أو تعطيل المؤثرات الصوتية</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  soundEngine.setMuted(!soundEngine.isMuted);
                  handleInputChange('_soundUpdate', Date.now()); 
                }}
                className={`w-14 h-7 rounded-full transition-all duration-300 relative ${!soundEngine.isMuted ? 'bg-indigo-500 shadow-md shadow-indigo-200' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${!soundEngine.isMuted ? 'right-1' : 'right-8'}`}></div>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 px-1">
                <span>مستوى الصوت</span>
                <span>{Math.round(soundEngine.volume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={soundEngine.volume}
                onChange={(e) => {
                  soundEngine.setVolume(parseFloat(e.target.value));
                  handleInputChange('_soundUpdate', Date.now());
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* معاينة الفاتورة */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">معاينة الفاتورة</h3>
        <div className="bg-white text-black p-6 rounded-lg font-mono text-sm">
          <div className="text-center mb-4">
            <h4 className="text-lg font-bold">{settings.companyName || 'مصنع الشنط البلاستيكية الرائد - Elking'}</h4>
            {settings.storeDescription && (
              <p className="text-sm text-gray-600">{settings.storeDescription}</p>
            )}
            <hr className="my-2" />
          </div>

          <div className="space-y-1 text-xs">
            {settings.companyAddress && <p>العنوان: {settings.companyAddress}</p>}
            {settings.companyPhone && <p>الهاتف: {settings.companyPhone}</p>}
            {settings.companyEmail && <p>البريد: {settings.companyEmail}</p>}
            {settings.storeTaxNumber && <p>الرقم الضريبي: {settings.storeTaxNumber}</p>}
          </div>

          <hr className="my-2" />
          <div className="text-center text-xs text-gray-600">
            <p>شكراً لزيارتكم</p>
            <p>Elking - مصنع الشنط البلاستيكية الرائد</p>
            <p>جميع الحقوق محفوظة {new Date().getFullYear()} ©</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreSettings;
