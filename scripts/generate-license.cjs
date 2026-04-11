const crypto = require('crypto');

// المفتاح السري (يجب أن يتطابق مع الموجود في licenseManager.js)
const SECRET_KEY = "Elking#2026!MasterKey$x99";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('استخدام: node generate-license.cjs <Machine-ID>');
  console.log('مثال: node generate-license.cjs ABCD-1234');
  process.exit(1);
}

const machineId = args[0].trim().toUpperCase();

// إنشاء هاش HMAC-SHA256
const hmac = crypto.createHmac('sha256', SECRET_KEY);
hmac.update(machineId);
const hash = hmac.digest('hex').toUpperCase();

// أخذ أول 16 حرف وتنسيقها
const formattedHash = hash.substring(0, 16);
const licenseKey = `${formattedHash.substring(0,4)}-${formattedHash.substring(4,8)}-${formattedHash.substring(8,12)}-${formattedHash.substring(12,16)}`;

console.log('\n==========================================');
console.log(`🔑 معرّف الجهاز (Machine ID): ${machineId}`);
console.log(`✅ كود التفعيل (License Key): ${licenseKey}`);
console.log('==========================================\n');
console.log('أرسل كود التفعيل للعميل ليقوم بإدخاله في النظام.\n');
