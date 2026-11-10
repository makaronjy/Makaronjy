/* =====================================================
ملف اللغات — مكرونجي Makaronjy
v15.8.1: مفاتيح طبقة الترقية كاملة (AR/EN) + حذف المهجور
         + v16: مفاتيح التنبيهات وبياناتي وسياسة الخصوصية
===================================================== */
window.I18N = {
ar: {
docTitle: 'مكرونجي | مكرونة بطعم لا يُقاوم',
brandName: 'مكرونجي',
brandTag: 'باستا • مقبلات • حلويات',
searchPh: '🔍 ابحث عن صنف...',
clearSearch: '✕ مسح البحث',
results: function(n){ return n + ' نتيجة'; },
open: 'مفتوح',
closed: 'مغلق',
welcomeTitle: 'أهلاً وسهلاً بكم',
welcomeMsg: 'اطلبوا ألذ أطباق المكرونة <b>واستلموها جاهزة</b> من أقرب فرع لكم! 🍝',
welcomeBtn: 'اطلب الآن 🍝',
featTitle: 'الأكثر مبيعاً',
browseMenu: 'تصفح قائمة الطعام',
calInfo: 'احتياج الفرد يومياً 2000 إلى 2500 سعرة حرارية وتختلف حسب الأشخاص',
designBy: 'تصميم',
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
currency: '﷼',
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
sheetTitle: 'تثبيت تطبيق مكرونجي',
installed: 'تم تثبيت التطبيق بنجاح ✔',
backToExit: '⚠️ اضغط مرة أخرى للخروج من التطبيق',
/* ===== الوجبات المفضلة ===== */
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
branchNearestBtn: '🎯 حدّد الفرع الأقرب لموقعي',
branchNearestBadge: '🎯 الأقرب لك',
branchGeoOn: '🎯 تم ترتيب الفروع حسب زمن الوصول الحقيقي',
branchGeoDenied: '⚠️ لم نتمكن من تحديد موقعك — اختر فرعك يدوياً',
branchSelected: function(n){ return '🍝 تم تحويل طلبك إلى: ' + n; },
chooseBtn: 'اختر ✓',
currentBranchFlag: '✓ فرعك الحالي',
changeBranch: 'تغيير الفرع',
waBranch: 'الفرع',
/* ===== شركاء التوصيل ===== */
deliveryHeadAr: 'اطلب الآن عبر شركائنا في التوصيل 🛵',
/* ===== الموقع والزحمة ===== */
branchReconfirm: function(n){ return '✓ تم تأكيد فرعك: ' + n; },
geoLocating: 'جارٍ تحديد موقعك...',
geoDeniedPerm: 'لم تمنح إذن الموقع — يمكنك الاختيار يدوياً',
geoOff: 'لم نتمكن من تحديد موقعك — فعّل خدمة الموقع (GPS) من إعدادات الهاتف ثم أعد المحاولة',
calcRoutes: '🚗 جارٍ حساب المسافات والزحمة...',
trafficLight: '🟢 زحمة خفيفة',
trafficMed: '🟠 زحمة متوسطة',
trafficHeavy: '🔴 زحمة شديدة',
kmUnit: 'كم',
minUnit: 'دقيقة',
closedWeek: 'مغلق هذا الأسبوع',
/* ===== حالة العمل الديناميكية ===== */
days: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
closesAt: function(h){ return 'يغلق عند الساعة ' + h; },
opensAt: function(h){ return 'يفتح عند الساعة ' + h; },
opensOn: function(d,h){ return 'يفتح يوم ' + d + ' عند الساعة ' + h; },
/* ===== إشعار المغلق ===== */
closedTitle: 'المطعم مغلق',
closedText: 'نعتذر منك، المطعم حالياً لا يستقبل الطلبات، ولكن بإمكانك اكتشاف وعرض قائمة الطعام',
closedBtn: 'عرض قائمة الطعام',
closedNote: 'مغلق يرجى العودة لاحقاً',
/* ===== التواصل ===== */
followUs: 'تابعنا على',
/* ===== التوفر والنفد ===== */
soldOut: 'نفد ❌',
notAvailableBranch: 'غير متوفر في هذا الفرع',
reconciled: '⚠️ أصناف لم تعد متوفرة أُزيلت من طلبك',
bestBadge: 'الأكثر مبيعًا',
/* ===== التحديث الحي ===== */
liveUpdated: 'تم تحديث القائمة',
/* ===== صفحة التفاصيل والإضافات ===== */
addToCart: 'إضافة للسلة',
addedToCart: '🛒 تمت الإضافة إلى سلتك',
modsInvalid: '⚠️ بعض الإضافات لم تعد متوفرة — أُزيلت من طلبك',
oftenWith: 'غالبًا ما يتم طلبه مع',
oftenWithEn: 'Often ordered with',
oftenWithSub: 'عادة ما يضيف الأشخاص هذه العناصر',
oftenWithSubEn: 'People usually add these items',
iosSteps:
  '<div class="sheet-step"><span class="num">١</span><p>من أسفل شاشة سفاري اضغط زر <b>المشاركة</b> (مربع يخرج منه سهم لأعلى ⬆️).</p></div>' +
  '<div class="sheet-step"><span class="num">٢</span><p>مرّر القائمة لأعلى واختر <b>«إضافة إلى الشاشة الرئيسية»</b> (أيقونة ＋).</p></div>' +
  '<div class="sheet-step"><span class="num">٣</span><p>اضغط <b>«إضافة»</b> — وستظهر أيقونة مكرونجي على جوالك 🎉</p></div>',
otherSteps:
  '<div class="sheet-step"><span class="num">١</span><p>افتح قائمة المتصفح (⋮ أو ⋯) أعلى الشاشة.</p></div>' +
  '<div class="sheet-step"><span class="num">٢</span><p>اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.</p></div>' +
  '<div class="sheet-step"><span class="num">٣</span><p>أكّد الإضافة — وستظهر أيقونة مكرونجي على جوالك 🎉</p></div>',
/* ===== إضافات طبقة الترقية v15 ===== */
orderTypeTitle: 'حدد نوع الطلب',
chooseOrderType: 'اضغط هنا لاختيار نوع الطلب',
pickup: 'الاستلام',
delivery: 'التوصيل',
restaurantDelivery: 'توصيل المطعم',
deliveryAppsHint: 'إتمام الطلب والدفع داخل التطبيق الشريك',
deliveryFee: 'رسوم التوصيل',
addressLabel: 'عنوان التوصيل',
addressPh: 'الحي، الشارع، أقرب معلم...',
addressRequired: '⚠️ يرجى كتابة عنوان التوصيل',
subtotal: 'المجموع الفرعي',
totalAmount: 'المبلغ الإجمالي',
viewCart: 'عرض السلة',
sideMenuTitle: 'القائمة',
sideFav: 'وجباتي المفضلة',
back: 'العودة',
confirm: 'تأكيد',
chooseBranchFirst: '⚠️ اختر فرعاً أولاً',
pickupBranch: 'اختر فرع الاستلام'
},
en: {
docTitle: 'Makaronjy | Irresistible Pasta',
brandName: 'Makaronjy',
brandTag: 'Pasta • Sides • Desserts',
searchPh: '🔍 Search for a dish...',
clearSearch: '✕ Clear Search',
results: function(n){ return (n===1) ? '1 result' : n + ' results'; },
open: 'Open',
closed: 'Closed',
welcomeTitle: 'Welcome',
welcomeMsg: 'Order the most delicious pasta dishes <b>and pick them up ready</b> from your nearest branch! 🍝',
welcomeBtn: 'Order Now 🍝',
featTitle: 'Best Sellers',
browseMenu: 'Browse the Menu',
calInfo: 'An average adult needs 2,000 to 2,500 calories per day; needs vary by person',
designBy: 'Design',
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
sheetTitle: 'Install Makaronjy App',
installed: 'App installed successfully ✔',
backToExit: '⚠️ Press back again to exit',
/* ===== Favorite Meals ===== */
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
branchNearestBtn: '🎯 Find My Nearest Branch',
branchNearestBadge: '🎯 Nearest to You',
branchGeoOn: '🎯 Branches sorted by real travel time',
branchGeoDenied: '⚠️ Could not get your location — choose manually',
branchSelected: function(n){ return '🍝 Your order branch: ' + n; },
chooseBtn: 'Choose ✓',
currentBranchFlag: '✓ Your Branch',
changeBranch: 'Change Branch',
waBranch: 'Branch',
/* ===== Delivery partners ===== */
deliveryHeadAr: 'Order now via our delivery partners 🛵',
/* ===== Location & traffic ===== */
branchReconfirm: function(n){ return '✓ Your branch confirmed: ' + n; },
geoLocating: 'Locating you...',
geoDeniedPerm: 'Location permission denied — you can choose manually',
geoOff: 'Could not locate you — enable location (GPS) in phone settings and retry',
calcRoutes: '🚗 Calculating routes & traffic...',
trafficLight: '🟢 light traffic',
trafficMed: '🟠 moderate traffic',
trafficHeavy: '🔴 heavy traffic',
kmUnit: 'km',
minUnit: 'min',
closedWeek: 'Closed this week',
/* ===== Dynamic open status ===== */
days: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
closesAt: function(h){ return 'Closes at ' + h; },
opensAt: function(h){ return 'Opens at ' + h; },
opensOn: function(d,h){ return 'Opens ' + d + ' at ' + h; },
/* ===== Closed notice ===== */
closedTitle: 'The Restaurant Closed',
closedText: 'We are sorry, the restaurant is not accepting orders right now, but you can still explore and view the menu',
closedBtn: 'View Menu',
closedNote: 'Closed — please come back later',
/* ===== Social ===== */
followUs: 'Follow us on',
/* ===== Availability & Sold-out ===== */
soldOut: 'Sold out ❌',
notAvailableBranch: 'Not available at this branch',
reconciled: '⚠️ Unavailable items were removed from your order',
bestBadge: 'Best Seller',
/* ===== Live update ===== */
liveUpdated: 'Menu updated',
/* ===== Detail page & add-ons ===== */
addToCart: 'Add to Cart',
addedToCart: '🛒 Added to your cart',
modsInvalid: '⚠️ Some add-ons are no longer available — removed from your order',
oftenWith: 'Often ordered with',
oftenWithEn: 'Often ordered with',
oftenWithSub: 'People usually add these items',
oftenWithSubEn: 'People usually add these items',
iosSteps:
  '<div class="sheet-step"><span class="num">1</span><p>In Safari, tap the <b>Share</b> button at the bottom (a square with an up arrow ⬆️).</p></div>' +
  '<div class="sheet-step"><span class="num">2</span><p>Scroll up and choose <b>"Add to Home Screen"</b> (＋ icon).</p></div>' +
  '<div class="sheet-step"><span class="num">3</span><p>Tap <b>"Add"</b> — the Makaronjy icon will appear on your home screen 🎉</p></div>',
otherSteps:
  '<div class="sheet-step"><span class="num">1</span><p>Open the browser menu (⋮ or ⋯) at the top.</p></div>' +
  '<div class="sheet-step"><span class="num">2</span><p>Choose <b>"Install App"</b> or <b>"Add to Home Screen"</b>.</p></div>' +
  '<div class="sheet-step"><span class="num">3</span><p>Confirm — the Makaronjy icon will appear on your home screen 🎉</p></div>',
/* ===== v15 Upgrade additions ===== */
orderTypeTitle: 'Order type',
chooseOrderType: 'Tap to choose order type',
pickup: 'Pickup',
delivery: 'Delivery',
restaurantDelivery: 'Restaurant delivery',
deliveryAppsHint: 'Checkout & payment inside the partner app',
deliveryFee: 'Delivery fee',
addressLabel: 'Delivery address',
addressPh: 'District, street, nearest landmark...',
addressRequired: '⚠️ Please enter delivery address',
subtotal: 'Subtotal',
totalAmount: 'Total amount',
viewCart: 'View cart',
sideMenuTitle: 'Menu',
sideFav: 'My favorites',
back: 'Back',
confirm: 'Confirm',
chooseBranchFirst: '⚠️ Choose a branch first',
pickupBranch: 'Choose pickup branch'
}
};

/* ===== v15.8: مفاتيح النصوص الجديدة تُدمج تلقائياً في اللغتين ===== */
(function(){
  var ADD = {
    ar: {
      deliveryAppsBtn: 'تطبيقات التوصيل',
      directOrderTitle: '🍝 اطلب مباشرة — ',
      freeDeliveryPill: 'التوصيل مجاني 🎉',
      feePerBranchPill: 'الرسوم حسب الفرع',
      feeFixedPill: 'التوصيل '
    },
    en: {
      deliveryAppsBtn: 'Delivery Apps',
      directOrderTitle: '🍝 Order direct — ',
      freeDeliveryPill: 'free delivery 🎉',
      feePerBranchPill: 'fee per branch',
      feeFixedPill: 'delivery '
    }
  };
  if (window.I18N) {
    Object.keys(ADD).forEach(function(lang){
      if (window.I18N[lang]) {
        Object.keys(ADD[lang]).forEach(function(k){
          if (window.I18N[lang][k] === undefined) window.I18N[lang][k] = ADD[lang][k];
        });
      }
    });
  }
})();

/* ===== v16: مفاتيح التنبيهات وبياناتي وسياسة الخصوصية ===== */
(function(){
  var ADD = {
    ar: {
      /* ===== أزرار القائمة الجانبية ===== */
      sideNotifications: 'تفعيل التنبيهات',
      sideData: 'بياناتي',
      sidePrivacy: 'سياسة الخصوصية',
      /* ===== نافذة التنبيهات ===== */
      notifTitle: '🔔 تفعيل التنبيهات',
      notifDesc: 'ابقَ على اطلاع دائم بحالة طلبك — من التأكيد إلى التسليم.',
      notifEnabled: 'التنبيهات مفعّلة ✓',
      notifDisabled: 'التنبيهات معطّلة',
      notifEnable: 'تفعيل',
      notifDisable: 'تعطيل',
      notifHintDenied: 'التنبيهات محظورة حالياً — يمكنك تفعيلها من إعدادات المتصفح/الجهاز.',
      notifHintUnsupported: 'متصفحك لا يدعم التنبيهات.',
      notifSuccess: '✔ تم تفعيل التنبيهات بنجاح',
      notifDisabledOk: 'تم تعطيل التنبيهات',
      /* ===== نافذة بياناتي ===== */
      dataTitle: '👤 بياناتي',
      dataDesc: 'بياناتك محفوظة على جهازك فقط ولا تُرسل إلا ضمن طلبك الحالي.',
      dataNameLbl: 'الاسم',
      dataPhoneLbl: 'رقم الجوال',
      dataSave: 'حفظ',
      dataSaved: '✔ تم حفظ بياناتك',
      dataNamePh: 'الاسم الكامل',
      dataPhonePh: '05XXXXXXXX',
      /* ===== نافذة سياسة الخصوصية ===== */
      privacyTitle: '🛡️ خصوصيتك وأمان بياناتك',
      privacyIntro: 'خصوصيتك مسؤوليتنا، وثقتك أولويتنا. نحرص في مكرونجي على حماية بياناتك واستخدامها بالحد الأدنى اللازم لتقديم تجربة طلب آمنة وسلسة.',
      privacy1Title: '1. البيانات الشخصية',
      privacy1Text: 'نجمع اسمك ورقم هاتفك فقط لمعالجة طلبك والتواصل معك بشأنه.',
      privacy2Title: '2. بيانات الموقع',
      privacy2Text: 'نطلب الوصول إلى موقعك عند اختيار التوصيل فقط، لتحديد موقع الاستلام ومساعدة السائق في الوصول إليك.',
      privacy3Title: '3. الإشعارات ومتابعة الطلب',
      privacy3Text: 'ننصحك بتفعيل الإشعارات لتبقى على اطلاع دائم بحالة طلبك، بدءاً من تأكيد استلامه والموافقة عليه، مروراً بمرحلة التجهيز، وحتى خروجه للتوصيل واكتمال التسليم. تفعيل الإشعارات يمنحك تجربة أفضل ويضمن لك معرفة آخر تحديثات طلبك أولاً بأول. الإشعارات اختيارية بالكامل، ويمكنك تفعيلها أو إيقافها في أي وقت.',
      privacy4Title: '4. تخزين البيانات',
      privacy4Text: 'يُحفظ اسمك ورقم هاتفك محلياً على جهازك، ولا تُرسل هذه البيانات إلى خوادمنا إلا بالقدر اللازم لتنفيذ طلبك الحالي.',
      privacy5Title: '5. عدم مشاركة البيانات',
      privacy5Text: 'لا نبيع بياناتك الشخصية أو نستخدمها لأغراض إعلانية، ولا نشاركها مع جهات خارجية.',
      privacy6Title: '6. صور إثبات التسليم',
      privacy6Text: 'تكون صور إثبات التسليم متاحة للفرع المختص فقط، وتُحذف بشكل دوري وفق سياسة الاحتفاظ بالبيانات.',
      privacyFooter: 'خصوصيتك ليست خياراً إضافياً، بل جزء أساسي من تجربتك مع مكرونجي.',
      privacyRights: '© مكرونجي | جميع الحقوق محفوظة',
      privacyClose: 'إغلاق'
    },
    en: {
      /* ===== Side menu buttons ===== */
      sideNotifications: 'Enable Notifications',
      sideData: 'My Data',
      sidePrivacy: 'Privacy Policy',
      /* ===== Notifications modal ===== */
      notifTitle: '🔔 Enable Notifications',
      notifDesc: 'Stay updated on your order — from confirmation to delivery.',
      notifEnabled: 'Notifications Enabled ✓',
      notifDisabled: 'Notifications Disabled',
      notifEnable: 'Enable',
      notifDisable: 'Disable',
      notifHintDenied: 'Notifications are currently blocked — enable them from browser/device settings.',
      notifHintUnsupported: 'Your browser does not support notifications.',
      notifSuccess: '✔ Notifications enabled successfully',
      notifDisabledOk: 'Notifications disabled',
      /* ===== My Data modal ===== */
      dataTitle: '👤 My Data',
      dataDesc: 'Your data is stored locally on your device and is only sent with your current order.',
      dataNameLbl: 'Name',
      dataPhoneLbl: 'Phone',
      dataSave: 'Save',
      dataSaved: '✔ Your data has been saved',
      dataNamePh: 'Full name',
      dataPhonePh: '05XXXXXXXX',
      /* ===== Privacy Policy modal ===== */
      privacyTitle: '🛡️ Your Privacy & Data Security',
      privacyIntro: 'Your privacy is our responsibility, and your trust is our priority. At Makaronjy, we are committed to protecting your data and using only the minimum necessary to provide a safe and smooth ordering experience.',
      privacy1Title: '1. Personal Data',
      privacy1Text: 'We collect only your name and phone number to process your order and communicate with you about it.',
      privacy2Title: '2. Location Data',
      privacy2Text: 'We request access to your location only when you choose delivery, to identify the pickup location and help the driver reach you.',
      privacy3Title: '3. Notifications & Order Tracking',
      privacy3Text: 'We recommend enabling notifications to stay informed about your order status, from receipt confirmation and approval, through the preparation stage, until dispatch and delivery completion. Enabling notifications gives you a better experience and ensures you know the latest updates about your order in real time. Notifications are fully optional, and you can enable or disable them at any time.',
      privacy4Title: '4. Data Storage',
      privacy4Text: 'Your name and phone number are stored locally on your device, and this data is sent to our servers only as needed to fulfill your current order.',
      privacy5Title: '5. No Data Sharing',
      privacy5Text: 'We do not sell your personal data, use it for advertising, or share it with third parties.',
      privacy6Title: '6. Delivery Proof Photos',
      privacy6Text: 'Delivery proof photos are available only to the relevant branch and are periodically deleted according to our data retention policy.',
      privacyFooter: 'Your privacy is not an optional add-on — it is an essential part of your Makaronjy experience.',
      privacyRights: '© Makaronjy | All rights reserved',
      privacyClose: 'Close'
    }
  };
  if (window.I18N) {
    Object.keys(ADD).forEach(function(lang){
      if (window.I18N[lang]) {
        Object.keys(ADD[lang]).forEach(function(k){
          if (window.I18N[lang][k] === undefined) window.I18N[lang][k] = ADD[lang][k];
        });
      }
    });
  }
})();
