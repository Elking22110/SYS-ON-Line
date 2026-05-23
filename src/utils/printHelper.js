/**
 * printHelper.js
 * يفتح نافذة طباعة واحدة فقط بدون أي تكرار.
 * الحل: نستخدم Blob URL بدلاً من about:blank لتجنّب حدث onload المزدوج.
 */
export const printHtmlContent = (html) => {
    // 1. أنماط الطباعة والتنسيق لزر الطباعة العائم
    const printStyles = `
        <style>
            @media print {
                button, .no-print, .no-print-container { display: none !important; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding-top: 0 !important; }
                @page { margin: 0; }
                /* منع أي تكرار أو مشاكل في تقسيم الصفحات بسبب overflow hidden */
                .card, .section, .invoice-header, .totals, .hdr, .strip, table, tr, td, th {
                    overflow: visible !important;
                    height: auto !important;
                    max-height: none !important;
                    page-break-inside: auto !important;
                }
                tr {
                    page-break-inside: avoid !important;
                }
            }
            /* تنسيق زر الطباعة العائم للمعاينة */
            .no-print-btn {
                background: #5235E8;
                color: #fff;
                border: none;
                padding: 10px 24px;
                font-size: 14px;
                font-weight: bold;
                font-family: system-ui, -apple-system, sans-serif;
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 4px 10px rgba(82, 53, 232, 0.3);
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            .no-print-btn:hover {
                background: #4124c7;
                transform: translateY(-1px);
                box-shadow: 0 6px 14px rgba(82, 53, 232, 0.4);
            }
            .no-print-container {
                text-align: center;
                padding: 12px 0;
                background: #f1f5f9;
                border-bottom: 1px solid #cbd5e1;
                position: sticky;
                top: 0;
                z-index: 99999;
                width: 100%;
            }
        </style>
    `;

    // 2. زر الطباعة العائم
    const printButtonHtml = `
        <div class="no-print no-print-container">
            <button class="no-print-btn" onclick="window.print()">
                🖨️ طباعة الفاتورة / التقرير
            </button>
        </div>
    `;

    // 3. كود التشغيل التلقائي الآمن للطباعة من داخل النافذة نفسها (لتجنب قيود السيكيورتي في Electron)
    const autoPrintScript = `
        <script>
            window.localPrinted = false;
            window.onload = function() {
                if (window.localPrinted) return;
                window.localPrinted = true;
                setTimeout(function() {
                    window.focus();
                    window.print();
                }, 500);
            };
        </script>
    `;

    // 4. دمج التعديلات في مستند الـ HTML
    let finalHtml = html;
    
    // إضافة الاستايلات
    if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `${printStyles}</head>`);
    } else {
        finalHtml = printStyles + finalHtml;
    }

    // إضافة زر الطباعة في بداية الـ body
    if (finalHtml.includes('<body>')) {
        finalHtml = finalHtml.replace('<body>', `<body>${printButtonHtml}`);
    } else {
        finalHtml = printButtonHtml + finalHtml;
    }

    // إضافة كود الطباعة التلقائي في نهاية الـ body
    if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${autoPrintScript}</body>`);
    } else {
        finalHtml = finalHtml + autoPrintScript;
    }

    // ── فتح النافذة وعرض المحتوى ──
    let blobUrl = null;

    try {
        const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
        blobUrl = URL.createObjectURL(blob);

        const printWindow = window.open(blobUrl, '_blank', 'width=950,height=750');

        if (!printWindow) {
            alert('يرجى السماح بالنوافذ المنبثقة لتمكين الطباعة.');
            URL.revokeObjectURL(blobUrl);
            return;
        }

        // تنظيف الـ Blob URL عند إغلاق النافذة أو بعد وقت طويل كاحتياطي
        try {
            printWindow.addEventListener('unload', () => {
                URL.revokeObjectURL(blobUrl);
            });
        } catch (e) {
            // كاحتياطي في حالة عدم دعم الحدث أو القيود
            setTimeout(() => {
                if (blobUrl) {
                    try { URL.revokeObjectURL(blobUrl); } catch(err) {}
                }
            }, 60000);
        }

    } catch (e) {
        console.error('Print error:', e);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        alert('حدث خطأ أثناء فتح نافذة الطباعة. يرجى المحاولة مرة أخرى.');
    }
};
