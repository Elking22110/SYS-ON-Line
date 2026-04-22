/**
 * printHelper.js
 * يفتح نافذة طباعة واحدة فقط بدون أي تكرار.
 * الحل: نستخدم Blob URL بدلاً من about:blank لتجنّب حدث onload المزدوج.
 */
export const printHtmlContent = (html) => {
    // إضافة أنماط الطباعة إن لم تكن موجودة
    const printStyles = `
        <style>
            @media print {
                button { display: none !important; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @page { margin: 0; }
            }
        </style>
    `;
    const finalHtml = html.includes('@media print')
        ? html
        : html.replace('</head>', `${printStyles}</head>`);

    // ── الطريقة: Blob URL ──────────────────────────────────────────
    // نحوّل الـ HTML إلى ملف مؤقت في الذاكرة ونفتحه مباشرة،
    // فلا يمر بمرحلة about:blank ولا يطلق onload مرتين.
    let blobUrl = null;

    try {
        const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
        blobUrl = URL.createObjectURL(blob);

        const printWindow = window.open(blobUrl, '_blank', 'width=900,height=700');

        if (!printWindow) {
            alert('يرجى السماح بالنوافذ المنبثقة لتمكين الطباعة.');
            URL.revokeObjectURL(blobUrl);
            return;
        }

        // نافذة واحدة تُطلق print() مرة واحدة بعد التحميل الكامل
        let printed = false;

        const doPrint = () => {
            if (printed) return;
            printed = true;
            printWindow.focus();
            printWindow.print();
            // تنظيف الـ Blob URL بعد فتح نافذة الطباعة
            setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
        };

        printWindow.addEventListener('load', () => {
            // تأخير بسيط لضمان رسم الـ CSS (الـ gradients وغيرها)
            setTimeout(doPrint, 400);
        });

        // Fallback: لو onload لم يُطلق في 4 ثواني (نادر)
        const fallbackTimer = setTimeout(() => {
            if (!printed && printWindow && !printWindow.closed) {
                doPrint();
            }
        }, 4000);

        // إلغاء الـ fallback لو onload اشتغل أولاً
        printWindow.addEventListener('load', () => clearTimeout(fallbackTimer));

    } catch (e) {
        console.error('Print error:', e);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        alert('حدث خطأ أثناء فتح نافذة الطباعة. يرجى المحاولة مرة أخرى.');
    }
};
