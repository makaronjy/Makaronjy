/* =====================================================
ملف اللغات — مكرونجي Makaronjy
(ترجمات الواجهة فقط — المنيو في menu.js والإعدادات في settings.js)
===================================================== */

window.I18N = {

  ar: {
    docTitle: 'مكرونجي | مكرونة بطعم لا يُقاوم',
    brandName: 'مكرونجي',
    brandTag: 'باستا • مقبلات • حلويات',
    heroTitle: 'مكرونجي',
    heroSubtitle: 'مكرونة بطعم لا يُقاوم',
    searchPh: '🔍 ابحث عن صنف...',
    clearSearch: '✕ مسح البحث',
    results: function(n){ return n + ' نتيجة'; },
    open: 'مفتوح',
    closed: 'مغلق',
    welcomeTitle: 'أهلاً وسهلاً بكم',
    welcomeMsg: 'اطلبوا ألذ أطباق المكرونة <b>واستلموها جاهزة</b> من أقرب فرع لكم! 🍝',
    welcomeBtn: 'اطلب الآن 🍝',
    loading: 'جارٍ تجهيز الأطباق... 🍽️',
    loadDone: 'اكتمل التحميل ✔',
    skip: 'تخطي والذهاب للمنيو ⏭',
    featTitle: 'الأكثر مبيعاً',
    browseMenu: 'تصفح قائمة الطعام',
    branches: 'الفروع',
    getDir: 'التوجه للمطعم',
    call: 'الاتصال مباشر',
    calInfo: 'احتياج الفرد يومياً 2000 إلى 2500 سعرة حرارية وتختلف حسب الأشخاص',
    designBy: 'تصميم',
    yourOrder: 'طلبك',
    cartTitle: 'سلة الطلبات',
    notePh: '📝 توصية / ملاحظة',
    orderPickup: 'استلام من الفرع',
    pickupNote: 'طلبك يكون جاهزاً عند وصولك للفرع',
    total: 'الإجمالي',
    taxInc: '(شامل الضريبة)',
    orderWa: 'إتمام الطلب عبر واتساب',
    orderSent: '✅ تم إرسال طلبك بنجاح',
    emptyCart: '🛒 <br>سلتك فارغة.. <br>أضف أصنافك المفضلة!',
    emptyMsg: 'سلتك فارغة 🛒',
    noResults: 'لا توجد نتائج 🔍',
    currency: 'ريال',
    cal: 'سعرة',
    zeroCal: '💧 صفر سعرات',
    from: 'من',
    prevSec: 'القسم السابق',
    nextSec: 'القسم التالي',
    sizes: ['صغير','وسط','كبير'],
    waGreeting: 'السلام عليكم مكرونجي 🍝',
    waOrderTitle: 'طلب جديد',
    waOrderType: 'نوع الطلب',
    waNote: 'ملاحظة',
    waThanks: '🍝 شكراً لاختياركم مكرونجي',
    installApp: 'تثبيت التطبيق',
    sheetTitle: 'تثبيت تطبيق مكرونجي',
    installed: 'تم تثبيت التطبيق بنجاح ✔',
    backToExit: '⚠️ اضغط مرة أخرى للخروج من التطبيق',

    /* ===== الوجبات المفضلة ===== */
    favFabLabel: 'وجباتي المفضلة',
    favTitle: 'وجباتي المفضلة ❤️',
    favPageNote: 'وجباتك المحفوظة بانتظارك 🍽️ اضغط «اطلبها الآن» وستُضاف كل أصناف الوجبة إلى سلتك فوراً — أعد طلبك بضغطة واحدة!',
    favSaveBtn: '💾 حفظ الوجبة كمفضلة',
    favChooseSlot: 'اختر اسم الوجبة:',
    favOverwrite: 'هذه الخانة تحتوي على وجبة محفوظة، هل تريد استبدالها؟',
    favOrderNow: '🛒 اطلبها الآن',
    favDelete: '🗑 حذف',
    favEmptySlot: 'خانة فارغة — احفظ وجبة من السلة',
    favSavedOk: '✔ تم حفظ الوجبة بنجاح',
    favDeleted: 'تم حذف الوجبة',
    favAddedToCart: '🛒 تمت إضافة الوجبة إلى سلتك',
    favCartEmpty: '⚠️ السلة فارغة، أضف أصنافاً أولاً',
    favCancel: 'إلغاء',
    favSlots: ['فطور 🌅','غداء ☀️','عشاء 🌙'],
    favReplaceTitle: 'استبدال الوجبة المحفوظة',
    favConfirmYes: 'نعم، استبدال',

    /* ===== الفروع ===== */
    branchGateTitle: 'اختر فرعك للطلب 📍',
    gateBrand: 'مطاعم مكرونجي',
    gateTagline: 'مكرونة بطعم لا يُقاوم',
    gateListBtn: 'قائمة الفروع',
    branchNearestBtn: '🎯 حدّد الفرع الأقرب لموقعي',
    branchNearestBadge: '🎯 الأقرب لك',
    branchGeoOn: '🎯 تم إبراز أقرب فرع لك',
    branchGeoDenied: '⚠️ لم نتمكن من تحديد موقعك — اختر فرعك يدوياً',
    branchSelected: function(n){ return '🍝 تم تحويل طلبك إلى: ' + n; },
    chooseBtn: 'اختر ✓',
    currentBranchFlag: '✓ فرعك الحالي',
    changeBranch: 'تغيير الفرع',
    waBranch: 'الفرع',

    /* ===== شركاء التوصيل (عنوان ثنائي اللغة دائم) ===== */
    deliveryHeadAr: 'اطلب الآن عبر شركائنا في التوصيل',
    deliveryHeadEn: 'Order now via our delivery partners',

    /* ===== اختيار الفرع والموقع ===== */
    branchReconfirm: function(n){ return '✓ تم تأكيد فرعك: ' + n; },
    geoLocating: 'جارٍ تحديد موقعك...',
    geoDeniedPerm: 'لم تمنح إذن الموقع — يمكنك الاختيار يدوياً',
    geoOff: 'لم نتمكن من تحديد موقعك — فعّل خدمة الموقع (GPS) من إعدادات الهاتف ثم أعد المحاولة',
    closedWeek: 'مغلق هذا الأسبوع',

    /* ===== حالة العمل الديناميكية ===== */
    days: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
    closesAt: function(h){ return 'يغلق عند الساعة ' + h; },
    opensAt: function(h){ return 'يفتح عند الساعة ' + h; },
    opensOn: function(d,h){ return 'يفتح يوم ' + d + ' عند الساعة ' + h; },

    /* ===== التوفر والنفد ===== */
    soldOut: 'نفد ❌',
    notAvailableBranch: 'غير متوفر في هذا الفرع',
    reconciled: '⚠️ أصناف لم تعد متوفرة أُزيلت من طلبك',
    bestBadge: 'الأكثر مبيعًا',

    /* ===== التحديث الحي ===== */
    liveUpdated: 'تم تحديث القائمة',
    iosSteps:
      '<div class="sheet-step"><span class="num">١</span><p>من أسفل شاشة سفاري اضغط زر <b>المشاركة</b> (مربع يخرج منه سهم لأعلى ⬆️).</p></div>' +
      '<div class="sheet-step"><span class="num">٢</span><p>مرّر القائمة لأعلى واختر <b>«إضافة إلى الشاشة الرئيسية»</b> (أيقونة ＋).</p></div>' +
      '<div class="sheet-step"><span class="num">٣</span><p>اضغط <b>«إضافة»</b> — وستظهر أيقونة مكرونجي على جوالك 🎉</p></div>',
    otherSteps:
      '<div class="sheet-step"><span class="num">١</span><p>افتح قائمة المتصفح (⋮ أو ⋯) أعلى الشاشة.</p></div>' +
      '<div class="sheet-step"><span class="num">٢</span><p>اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.</p></div>' +
      '<div class="sheet-step"><span class="num">٣</span><p>أكّد الإضافة — وستظهر أيقونة مكرونجي على جوالك 🎉</p></div>'
  },

  en: {
    docTitle: 'Makaronjy | Irresistible Pasta',
    brandName: 'Makaronjy',
    brandTag: 'Pasta • Sides • Desserts',
    heroTitle: 'Makaronjy',
    heroSubtitle: 'Irresistible pasta',
    searchPh: '🔍 Search for a dish...',
    clearSearch: '✕ Clear Search',
    results: function(n){ return (n===1) ? '1 result' : n + ' results'; },
    open: 'Open',
    closed: 'Closed',
    welcomeTitle: 'Welcome',
    welcomeMsg: 'Order the most delicious pasta dishes <b>and pick them up ready</b> from your nearest branch! 🍝',
    welcomeBtn: 'Order Now 🍝',
    loading: 'Preparing your dishes... 🍽️',
    loadDone: 'Loading complete ✔',
    skip: 'Skip to menu ⏭',
    featTitle: 'Best Sellers',
    browseMenu: 'Browse the Menu',
    branches: 'Branches',
    getDir: 'Directions',
    call: 'Call Us',
    calInfo: 'An average adult needs 2,000 to 2,500 calories per day; needs vary by person',
    designBy: 'Design',
    yourOrder: 'Your Order',
    cartTitle: 'Order Cart',
    notePh: '📝 Recommendation / Note',
    orderPickup: 'Branch pickup',
    pickupNote: 'Your order will be ready upon arrival',
    total: 'Total',
    taxInc: '(VAT included)',
    orderWa: 'Complete Order via WhatsApp',
    orderSent: '✅ Your order was sent successfully',
    emptyCart: '🛒 <br>Your cart is empty.. <br>Add your favorite items!',
    emptyMsg: 'Your cart is empty 🛒',
    noResults: 'No results 🔍',
    currency: 'SAR',
    cal: 'cal',
    zeroCal: '💧 Zero calories',
    from: 'From',
    prevSec: 'Previous Section',
    nextSec: 'Next Section',
    sizes: ['Small','Medium','Large'],
    waGreeting: 'Hello Makaronjy 🍝',
    waOrderTitle: 'New Order',
    waOrderType: 'Order Type',
    waNote: 'Notes',
    waThanks: '🍝 Thank you for choosing Makaronjy',
    installApp: 'Install App',
    sheetTitle: 'Install Makaronjy App',
    installed: 'App installed successfully ✔',
    backToExit: '⚠️ Press back again to exit',

    /* ===== Favorite Meals ===== */
    favFabLabel: 'My Favorite Meals',
    favTitle: 'My Favorite Meals ❤️',
    favPageNote: 'Your saved meals are ready 🍽️ Tap "Order Now" and all items will be added to your cart instantly — reorder in one tap!',
    favSaveBtn: '💾 Save Meal as Favorite',
    favChooseSlot: 'Choose a meal name:',
    favOverwrite: 'This slot already has a saved meal. Replace it?',
    favOrderNow: '🛒 Order Now',
    favDelete: '🗑 Delete',
    favEmptySlot: 'Empty slot — save a meal from the cart',
    favSavedOk: '✔ Meal saved successfully',
    favDeleted: 'Meal deleted',
    favAddedToCart: '🛒 Meal added to your cart',
    favCartEmpty: '⚠️ Cart is empty, add items first',
    favCancel: 'Cancel',
    favSlots: ['Breakfast 🌅','Lunch ☀️','Dinner 🌙'],
    favReplaceTitle: 'Replace Saved Meal',
    favConfirmYes: 'Yes, Replace',

    /* ===== Branches ===== */
    branchGateTitle: 'Choose Your Branch 📍',
    gateBrand: 'Makaronjy Restaurants',
    gateTagline: 'Irresistible pasta experience',
    gateListBtn: 'Branch List',
    branchNearestBtn: '🎯 Find My Nearest Branch',
    branchNearestBadge: '🎯 Nearest to You',
    branchGeoOn: '🎯 Nearest branch highlighted',
    branchGeoDenied: '⚠️ Could not get your location — choose manually',
    branchSelected: function(n){ return '🍝 Your order branch: ' + n; },
    chooseBtn: 'Choose ✓',
    currentBranchFlag: '✓ Your Branch',
    changeBranch: 'Change Branch',
    waBranch: 'Branch',

    /* ===== Delivery partners (bilingual heading always) ===== */
    deliveryHeadAr: 'Order now via our delivery partners',
    deliveryHeadEn: 'اطلب الآن عبر شركائنا في التوصيل',

    /* ===== Branch selection & location ===== */
    branchReconfirm: function(n){ return '✓ Your branch confirmed: ' + n; },
    geoLocating: 'Locating you...',
    geoDeniedPerm: 'Location permission denied — you can choose manually',
    geoOff: 'Could not locate you — enable location (GPS) in phone settings and retry',
    closedWeek: 'Closed this week',

    /* ===== Dynamic open status ===== */
    days: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    closesAt: function(h){ return 'Closes at ' + h; },
    opensAt: function(h){ return 'Opens at ' + h; },
    opensOn: function(d,h){ return 'Opens ' + d + ' at ' + h; },

    /* ===== Availability & Sold-out ===== */
    soldOut: 'Sold out ❌',
    notAvailableBranch: 'Not available at this branch',
    reconciled: '⚠️ Unavailable items were removed from your order',
    bestBadge: 'Best Seller',

    /* ===== Live update ===== */
    liveUpdated: 'Menu updated',
    iosSteps:
      '<div class="sheet-step"><span class="num">1</span><p>In Safari, tap the <b>Share</b> button at the bottom (a square with an up arrow ⬆️).</p></div>' +
      '<div class="sheet-step"><span class="num">2</span><p>Scroll up and choose <b>"Add to Home Screen"</b> (＋ icon).</p></div>' +
      '<div class="sheet-step"><span class="num">3</span><p>Tap <b>"Add"</b> — the Makaronjy icon will appear on your home screen 🎉</p></div>',
    otherSteps:
      '<div class="sheet-step"><span class="num">1</span><p>Open the browser menu (⋮ or ⋯) at the top.</p></div>' +
      '<div class="sheet-step"><span class="num">2</span><p>Choose <b>"Install App"</b> or <b>"Add to Home Screen"</b>.</p></div>' +
      '<div class="sheet-step"><span class="num">3</span><p>Confirm — the Makaronjy icon will appear on your home screen 🎉</p></div>'
  }

};
