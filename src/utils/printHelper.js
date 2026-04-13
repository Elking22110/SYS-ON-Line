export const printHtmlContent = (html) => {
    // إخفاء الأزرار عند الطباعة والتأكد من دعم الاتجاهات
    const printStyles = `
        <style>
            @media print {
                button { display: none !important; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        </style>
    `;
    const finalHtml = html.replace('</head>', `${printStyles}</head>`);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    try {
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(finalHtml);
        doc.close();

        // الانتظار قليلاً حتى يتم تحميل الصور والمستند
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (e) {
                console.error('Print failed:', e);
            }
            
            // تنظيف بعد الطباعة
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 10000);
        }, 800);
    } catch (e) {
        console.error('Iframe creation failed', e);
        // Fallback to blob if iframe fails
        const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }
};
