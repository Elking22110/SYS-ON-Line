export const printHtmlContent = (html) => {
    // إخفاء الأزرار عند الطباعة والتأكد من دعم الاتجاهات
    const printStyles = `
        <style>
            @media print {
                button { display: none !important; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @page { margin: 0; }
            }
        </style>
    `;
    const finalHtml = html.replace('</head>', `${printStyles}</head>`);

    // إنشاء نافذة مؤقتة بدلاً من iframe لدعم المعاينة في Electron
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
        console.error('Failed to open print window. Pop-up blocker might be active.');
        alert('يرجى السماح بالنوافذ المنبثقة لتمكين الطباعة.');
        return;
    }

    try {
        printWindow.document.open();
        printWindow.document.write(finalHtml);
        printWindow.document.close();

        // الانتظار حتى يتم تحميل المحتوى والصور
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                // إغلاق النافذة بعد الانتهاء أو إلغاء الطباعة
                // نستخدم تركيز النافذة الأصلية للكشف عن انتهاء الطباعة في بعض المتصفحات
                // أو نتركها للمستخدم ليغلقها لضمان عدم ضياع المعاينة
                setTimeout(() => {
                    if (!printWindow.closed) {
                        printWindow.close();
                    }
                }, 500);
            }, 500);
        };

        // Fallback في حال لم يعمل onload
        setTimeout(() => {
            if (printWindow && !printWindow.closed) {
                printWindow.focus();
                printWindow.print();
            }
        }, 2000);

    } catch (e) {
        console.error('Printing failed:', e);
        // Fallback to blob
        const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
};
