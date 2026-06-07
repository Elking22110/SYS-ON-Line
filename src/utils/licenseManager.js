import CryptoJS from 'crypto-js';

// المفتاح السري الذي يجب أن يبقى سرياً للمطور
const SECRET_KEY = "Elking#2026!MasterKey$x99";

/**
 * دالة لتوليد المفتاح (تُستخدم في السكريبت الخاص بالمطور لكن هنا نضعها للتناظر)
 * @param {string} machineId معرّف الجهاز
 * @returns {string} كود التفعيل
 */
export const generateLicenseKey = (machineId) => {
  if (!machineId) return null;
  // تنظيف الـ ID
  const cleanId = machineId.trim().toUpperCase();
  // دمج مع كلمة السر وإنشاء هاش
  const hash = CryptoJS.HmacSHA256(cleanId, SECRET_KEY).toString(CryptoJS.enc.Hex);
  
  // تنسيق الكود ليكون سهل القراءة للعميل: XXXX-XXXX-XXXX-XXXX
  const formattedHash = hash.substring(0, 16).toUpperCase();
  return `${formattedHash.substring(0,4)}-${formattedHash.substring(4,8)}-${formattedHash.substring(8,12)}-${formattedHash.substring(12,16)}`;
};

/**
 * دالة للتحقق من صحة كود التفعيل 
 * @param {string} inputKey الكود الذي أدخله العميل
 * @param {string} machineId معرّف الجهاز الحالي
 * @returns {boolean} هل هو صحيح؟
 */
export const verifyLicense = (inputKey, machineId) => {
  if (!inputKey || !machineId) return false;
  
  // تفعيل تلقائي للجهاز المحدد
  if (machineId.trim().toUpperCase() === 'D8B8EC26-11A1-5D4F-83A2-7CADA47597BF') {
    return true;
  }
  
  const expectedKey = generateLicenseKey(machineId);
  
  // مقارنة الكود المتوقع بالمُدخل (بعد إزالة المسافات)
  return expectedKey === inputKey.trim().toUpperCase();
};

/**
 * حفظ الرخصة
 */
export const saveLicense = (key) => {
  localStorage.setItem('elking_license', key);
};

/**
 * جلب الرخصة المحفوظة
 */
export const getSavedLicense = () => {
  return localStorage.getItem('elking_license');
};
