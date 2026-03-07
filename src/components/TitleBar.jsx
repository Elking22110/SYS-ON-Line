import React, { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        // التحقق من حالة النافذة عند بدء التشغيل
        const checkMaximized = async () => {
            if (window.windowControl && window.windowControl.isMaximized) {
                const maximized = await window.windowControl.isMaximized();
                setIsMaximized(maximized);
            }
        };
        checkMaximized();

        // مراقبة تغيير حجم النافذة
        const handleResize = () => {
            checkMaximized();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleMinimize = () => {
        if (window.windowControl) window.windowControl.minimize();
    };

    const handleMaximize = () => {
        if (window.windowControl) {
            window.windowControl.maximize();
            setIsMaximized(!isMaximized);
        }
    };

    const handleClose = () => {
        if (window.windowControl) window.windowControl.close();
    };

    return (
        <div
            className="h-9 min-h-[36px] bg-[#1e1e2d] text-gray-300 select-none flex justify-between items-center z-50 w-full shrink-0"
            style={{ WebkitAppRegion: 'drag' }}
        >
            {/* عنوان التطبيق */}
            <div className="flex items-center space-x-2 space-x-reverse px-4">
                <span className="text-sm font-semibold">Elking</span>
            </div>

            {/* أزرار التحكم - يجب أن تكون غير قابلة للسحب */}
            <div
                className="flex h-full"
                style={{ WebkitAppRegion: 'no-drag' }}
            >
                <button
                    onClick={handleMinimize}
                    className="h-full px-4 hover:bg-gray-700 transition-colors flex items-center justify-center focus:outline-none"
                    title="تصغير"
                >
                    <Minus size={16} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full px-4 hover:bg-gray-700 transition-colors flex items-center justify-center focus:outline-none"
                    title={isMaximized ? "استعادة" : "تكبير"}
                >
                    <Square size={14} />
                </button>
                <button
                    onClick={handleClose}
                    className="h-full px-4 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center focus:outline-none"
                    title="إغلاق"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
