import React, { useState, useEffect, useCallback } from 'react';
import { Search, Package, Footprints, Watch, Headphones, Smartphone, Laptop, Home, Car, Gamepad2, Book, Camera, Gift } from 'lucide-react';
import storageOptimizer from '../../utils/storageOptimizer.js';
import errorHandler from '../../utils/errorHandler.js';
import searchOptimizer from '../../utils/searchOptimizer.js';
import { subscribe, EVENTS } from '../../utils/observerManager';

const ProductGrid = ({
  selectedCategory,
  onCategoryChange,
  onAddToCart,
  categories,
  setCategories,
  products,
  setProducts,
  productImages,
  setProductImages
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const [supplies, setSupplies] = useState([]);

  // دالة للحصول على الأيقونة المناسبة لكل فئة
  const getCategoryIcon = (categoryName) => {
    const categoryIcons = {
      'نايلون': <Package className="h-8 w-8 text-blue-400" />,
      'أحذية': <Footprints className="h-8 w-8 text-brown-400" />,
      'ساعات': <Watch className="h-8 w-8 text-yellow-400" />,
      'إلكترونيات': <Smartphone className="h-8 w-8 text-purple-400" />,
      'أجهزة كمبيوتر': <Laptop className="h-8 w-8 text-slate-500" />,
      'منزل': <Home className="h-8 w-8 text-green-400" />,
      'سيارات': <Car className="h-8 w-8 text-red-400" />,
      'ألعاب': <Gamepad2 className="h-8 w-8 text-pink-400" />,
      'كتب': <Book className="h-8 w-8 text-orange-400" />,
      'كاميرات': <Camera className="h-8 w-8 text-indigo-400" />,
      'هدايا': <Gift className="h-8 w-8 text-rose-400" />,
      'سماعات': <Headphones className="h-8 w-8 text-cyan-400" />
    };

    return categoryIcons[categoryName] || <Package className="h-8 w-8 text-slate-500" />;
  };

  // تحميل البيانات المحسنة
  const loadData = useCallback(async () => {
    try {
      // استخدام StorageOptimizer للقراءة المحسنة
      const [categoriesData, productsData, suppliesData] = await Promise.all([
        storageOptimizer.get('productCategories', []),
        storageOptimizer.get('products', []),
        storageOptimizer.get('supplier_supplies', [])
      ]);

      setCategories(categoriesData);
      setProducts(productsData);
      setSupplies(suppliesData);

      try {
        const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
        const settings = JSON.parse(localStorage.getItem('pos-settings') || '{}');
        const rawFlag = (storeInfo.inventoryEnabled !== undefined ? storeInfo.inventoryEnabled : settings.inventoryEnabled);
        setInventoryEnabled(!(rawFlag === false || rawFlag === 'false' || rawFlag === 0 || rawFlag === '0'));
      } catch (_) { }
      setProductImages({}); // إزالة تحميل الصور
    } catch (error) {
      errorHandler.handleError(error, 'Data Loading', 'high');
    }
  }, [setCategories, setProducts, setProductImages]);

  useEffect(() => {
    loadData();

    // الاشتراك في تحديثات المنتجات لإعادة التحميل عند إضافة منتج جديد من التوريدات
    const unsubscribe = typeof subscribe === 'function' ? subscribe(EVENTS.PRODUCTS_CHANGED, loadData) : null;
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadData]);

  // فلترة المنتجات المحسنة مع البحث الذكي
  const filteredProducts = React.useMemo(() => {
    // إنشاء فهرس للبحث إذا لم يكن موجوداً
    if (searchOptimizer.getSearchStats().indexSize === 0) {
      searchOptimizer.createIndex(products, ['name', 'sku', 'barcode', 'description']);
    }

    // البحث المحسن
    let searchResults = products;
    if (searchTerm.trim().length > 1) {
      searchResults = searchOptimizer.performSearch(searchTerm, products, ['name', 'sku', 'barcode', 'description']);
    }

    // فلترة حسب الفئة وحالة المخزون (بحيث لا يظهر المنتج إذا بيع بالكامل)
    return searchResults.filter(product => {
      const matchesCategory = selectedCategory === 'الكل' || product.category === selectedCategory;

      let isAvailable = true;

      // إذا كان المنتج مرتبط بتوريدة، نتحقق من كمية التوريدة المتبقية
      if (product.supplyId) {
        const linkedSupply = supplies.find(s => s.id?.toString() === product.supplyId?.toString());
        if (linkedSupply) {
          const qty = linkedSupply.remainingQuantity !== undefined ? linkedSupply.remainingQuantity : linkedSupply.quantity;
          isAvailable = Number(qty) > 0;
        } else {
          // إذا لم نجد التوريدة في القائمة المحلية (ربما بسبب خطأ في المزامنة)، نظهر المنتج افتراضياً لو له كمية
          isAvailable = Number(product.stock || 0) > 0;
        }
      } else if (inventoryEnabled) {
        // إذا كان تتبع المخزون مفعلاً والمنتج غير مرتبط بتوريدة
        isAvailable = Number(product.stock || 0) > 0;
      }

      return matchesCategory && isAvailable;
    });
  }, [products, selectedCategory, searchTerm, inventoryEnabled, supplies]);


  return (
    <div className="flex-1 bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-200">
      {/* شريط البحث والفلاتر */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* البحث */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="البحث في المنتجات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* فئات المنتجات */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => onCategoryChange('الكل')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${selectedCategory === 'الكل'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
          >
            الكل
          </button>
          {categories.map((category, index) => (
            <button
              key={category.id || category.name || index}
              onClick={() => onCategoryChange(category.name)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${selectedCategory === category.name
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* شبكة المنتجات */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ipad-grid ipad-pro-grid">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => onAddToCart(product)}
            className="bg-white rounded-xl p-4 cursor-pointer hover:bg-blue-50 transition-all duration-300 hover:scale-105 hover:shadow-md border border-slate-200 hover:border-blue-300 group"
          >
            {/* أيقونة الفئة */}
            <div className="relative mb-3">
              <div className="w-full h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                {getCategoryIcon(product.category)}
              </div>
              {product.stock <= 5 && (
                <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  منخفض
                </div>
              )}
            </div>

            {/* معلومات المنتج */}
            <div className="text-center">
              <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {product.name}
              </h3>
              <p className="text-green-600 font-bold text-lg">
                {product.price.toLocaleString('en-US')} جنيه
              </p>
              <p className="text-slate-500 text-xs">
                المخزون: {product.stock}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* رسالة عدم وجود منتجات */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-500 mb-2">
            لا توجد منتجات
          </h3>
          <p className="text-slate-400">
            {searchTerm ? 'لم يتم العثور على منتجات تطابق البحث' : 'قم بإضافة منتجات جديدة'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
