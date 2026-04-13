const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// إعدادات سجل التحديثات
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// منع تشغيل نسختين من البرنامج في نفس الوقت
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow;

function createWindow() {
  // إنشاء النافذة الرئيسية
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Elking - نظام إدارة المتجر',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#0f172a',
    frame: true,
    autoHideMenuBar: true,
  });

  // تحميل الواجهة من ملفات dist
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexPath);

  // إظهار النافذة بعد التحميل الكامل
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // السماح بنوافذ الطباعة والتقارير فارغة المصدر، ومنع الروابط الخارجية
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || url === '') {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // تعطيل القائمة (F12, DevTools) في الإنتاج
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      (input.key === 'F12') ||
      (input.control && input.shift && input.key === 'I') ||
      (input.control && input.shift && input.key === 'J') ||
      (input.control && input.key === 'u')
    ) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// إذا حاول المستخدم فتح نسخة ثانية، يرجع للنافذة الموجودة
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// إزالة القائمة العلوية بالكامل
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  // إضافة مسار لاستخراج معرّف الجهاز (Hardware ID)
  ipcMain.handle('get-machine-id', () => {
    try {
      // المحاولة الأولى: PowerShell (الأحدث والأكثر دقة)
      try {
        const psId = execSync('powershell -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', { encoding: 'utf8' }).trim();
        if (psId && psId.length > 10) return psId;
      } catch (e) { /* ignore */ }

      // المحاولة الثانية: Registry (سجل النظام)
      try {
        const regId = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf8' }).trim();
        const match = regId.match(/[a-z0-9]{8}-([a-z0-9]{4}-){3}[a-z0-9]{12}/i);
        if (match) return match[0];
      } catch (e) { /* ignore */ }

      // المحاولة الثالثة: WMIC (لإصدارات وندوز القديمة)
      try {
        const wmicId = execSync('wmic csproduct get uuid', { encoding: 'utf8' }).trim().split('\n')[1]?.trim();
        if (wmicId && wmicId.length > 10) return wmicId;
      } catch (e) { /* ignore */ }

      return 'DEVICE-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    } catch (error) {
      console.error('Failed to get machine id:', error);
      return 'UNKNOWN-MACHINE-ID';
    }
  });

  createWindow();

  // فحص التحديثات وتطبيقها بصمت في الخلفية، وسيقوم تلقائياً بتحميل وتثبيت أي Release يتم إضافتها في GitHub
  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

// التعامل مع أخطاء غير متوقعة
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('خطأ في البرنامج', `حدث خطأ غير متوقع:\n${error.message}`);
});
