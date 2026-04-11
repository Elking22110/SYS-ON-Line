/**
 * سكريبت لتحضير أيقونة التطبيق
 * يقوم بنسخ الأيقونة PNG وإنشاء ملف icon.ico في مجلد electron
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const electronDir = path.join(__dirname, '..', 'electron');

// التحقق من وجود المجلد
if (!fs.existsSync(electronDir)) {
  fs.mkdirSync(electronDir, { recursive: true });
}

// نسخ الأيقونة PNG إذا موجودة
const iconSrc = path.join(__dirname, '..', 'public', 'icon.png');
const iconPngDst = path.join(electronDir, 'icon.png');

if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, iconPngDst);
  console.log('✅ تم نسخ الأيقونة PNG');
} else {
  console.log('⚠️ لم يتم العثور على icon.png في public/ - سيستخدم الأيقونة الافتراضية');
}

console.log('✅ مجلد electron جاهز');
console.log('📦 لبناء الـ installer، قم بتشغيل: npm run electron:pack');
