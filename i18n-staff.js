/* ═══════════════════════════════════════════
   مكرونجي — نظام الترجمة المركزي للصفحات الإدارية
   i18n-staff.js  v1.0
   
   يُستخدم في: login / supervisor / driver / track / admin
   (تطبيق العميل index.html يحتفظ بقاموسه الخاص في app.js)
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   القاموس الكامل (عربي + إنجليزي)
   ═══════════════════════════════════════════ */
window.STAFF_I18N = {

  ar: {
    /* ─── مشترك ─── */
    common: {
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      close: 'إغلاق',
      loading: 'جارٍ التحميل...',
      confirm: 'تأكيد',
      back: 'رجوع',
      next: 'التالي',
      prev: 'السابق',
      search: 'بحث',
      filter: 'تصفية',
      refresh: 'تحديث',
      logout: 'خروج',
      login: 'دخول',
      settings: 'الإعدادات',
      success: 'تم بنجاح',
      error: 'خطأ',
      warning: 'تنبيه',
      info: 'معلومة',
      yes: 'نعم',
      no: 'لا',
      ok: 'موافق',
      currency: 'ريال',
      date: 'التاريخ',
      time: 'الوقت',
      branch: 'الفرع',
      customer: 'العميل',
      driver: 'السائق',
      order: 'الطلب',
      total: 'الإجمالي',
      subtotal: 'المجموع الفرعي',
      status: 'الحالة',
      notes: 'ملاحظات',
      phone: 'الجوال',
      address: 'العنوان',
      amount: 'المبلغ',
      actions: 'الإجراءات',
      empty: 'لا توجد بيانات',
      connected: 'متصل',
      riyal: 'ريال'
    },

    /* ─── شاشة الدخول ─── */
    login: {
      title: 'دخول الموظفين',
      subtitle: 'مشرفو الفروع والسائقون فقط',
      username: 'اسم المستخدم',
      password: 'كلمة المرور',
      loginBtn: 'دخول',
      logging: 'جارٍ الدخول...',
      changeTitle: 'تغيير كلمة المرور',
      changeNote: 'هذه أول مرة تدخل بها. لحماية حسابك، اختر كلمة مرور جديدة: 8 أحرف على الأقل، وتحتوي حرفاً كبيراً وحرفاً صغيراً ورقماً.',
      newPass: 'كلمة المرور الجديدة',
      confirmPass: 'تأكيد كلمة المرور',
      savePass: 'حفظ ومتابعة',
      saving: 'جارٍ الحفظ...',
      brand: 'مكرونجي',
      rights: 'جميع الحقوق محفوظة',
      errEmpty: '⚠️ أدخل اسم المستخدم وكلمة المرور',
      errPassMismatch: '⚠️ كلمتا المرور غير متطابقتين',
      errPassWeak: '⚠️ كلمة المرور ضعيفة: 8 أحرف + حرف كبير + حرف صغير + رقم',
      okChanged: '✅ تم تغيير كلمة المرور بنجاح',
      errNetwork: '⚠️ تعذر الاتصال بالخادم — تحقق من الإنترنت',
      errUnknown: '⚠️ خطأ غير معروف'
    },

    /* ─── لوحة المشرف ─── */
    supervisor: {
      pageTitle: 'لوحة مشرف الفرع',
      sections: {
        newOrders: 'طلبات جديدة',
        inProgress: 'قيد التنفيذ',
        activeDelivery: 'توصيلات نشطة',
        deliveredToday: 'سُلّم اليوم'
      },
      stats: {
        todayOrders: 'طلبات اليوم',
        todayRevenue: 'مبيعات اليوم (ريال)',
        availableDrivers: 'سائقون متاحون'
      },
      actions: {
        confirm: '✅ تأكيد',
        reject: '❌ رفض',
        preparing: '👨‍🍳 قيد التحضير',
        ready: '📦 الطلب جاهز',
        readyForPickup: '📦 جاهز للاستلام',
        sendToPool: '📦 إرسال للسائقين',
        assignDriver: '🚗 تعيين',
        chooseDriver: '— اختر سائقاً —',
        pickupFromBranch: '✅ استلمه العميل من الفرع',
        pickupHint: '💵 حصّل',
        atCashier: 'ريال عند الكاشير',
        waVerify: '📱 واتس للتحقق',
        viewMap: 'عرض على الخريطة',
        openTracking: '🔎 فتح صفحة تتبع العميل',
        driverLocation: '🗺️ موقع السائق الآن',
        unknownDriver: 'سائق غير معروف',
        confirmReject: 'هل أنت متأكد من رفض هذا الطلب؟',
        confirmPickup: 'تأكيد إغلاق الطلب؟\n(العميل استلم طلبه من الفرع)'
      },
      badges: {
        pickup: '🏪 استلام',
        delivery: '🛵 توصيل',
        payment: {
          atCashier: 'عند الكاشير 🏪',
          cod: 'عند الاستلام',
          card: 'بطاقة'
        }
      },
      labels: {
        orderNum: 'رقم الطلب',
        customer: 'العميل',
        total: 'الإجمالي',
        status: 'الحالة',
        address: 'العنوان',
        items: 'الأصناف',
        driver: 'السائق',
        payment: 'الدفع',
        branch: 'الفرع'
      },
      empty: {
        newOrders: 'لا توجد طلبات جديدة حالياً 📭',
        inProgress: 'لا توجد طلبات قيد التنفيذ',
        activeDelivery: 'لا توجد توصيلات نشطة',
        deliveredToday: 'لم يُسلّم أي طلب بعد'
      },
      toast: {
        statusUpdated: 'تم تحديث الحالة ✅',
        driverAssigned: 'تم تعيين السائق 🚗',
        chooseDriverFirst: '⚠️ اختر سائقاً أولاً',
        updateFailed: 'تعذر التحديث — سيتم إعادة المحاولة'
      },
      report: {
        title: '🍝 مكرونجي — تقرير فرع',
        date: 'التاريخ',
        totalOrders: 'إجمالي الطلبات المعروضة',
        delivered: 'المسلّمة',
        revenue: 'الإيراد',
        fees: 'رسوم توصيل',
        savePdfHint: 'للحفظ PDF: اختر "حفظ كـ PDF" من نافذة الطباعة',
        columns: {
          orderNum: 'رقم الطلب',
          type: 'النوع',
          customer: 'العميل',
          phone: 'الجوال',
          total: 'الإجمالي',
          status: 'الحالة',
          driver: 'السائق'
        }
      },
      confirmLogout: 'هل تريد تسجيل الخروج؟'
    },

    /* ─── بوابة السائق ─── */
    driver: {
      pageTitle: 'بوابة السائق',
      login: {
        title: '🚗 بوابة السائق',
        subtitle: 'مكرونجي — سجّل دخولك لبدء التوصيل',
        placeholderUser: 'اسم المستخدم',
        placeholderPass: 'كلمة المرور',
        loginBtn: 'دخول',
        errEmpty: 'أكمل البيانات',
        errNotDriver: 'هذا الحساب ليس حساب سائق',
        errFailed: 'فشل الدخول'
      },
      stats: {
        todayDeliveries: 'توصيلات اليوم',
        todayEarnings: 'أرباح اليوم (ريال)'
      },
      sections: {
        currentDelivery: '🚗 التوصيل الحالي',
        availablePool: '📦 طلبات متاحة في الفرع',
        history: '📜 سجل التوصيلات'
      },
      steps: {
        assigned: 'مُسند',
        onTheWay: 'بالطريق',
        delivered: 'سلّم'
      },
      actions: {
        startDelivery: '🛵 انطلقت بالتوصيل',
        sorry: '❌ اعتذار عن التوصيل',
        deliverWithPhoto: '🎉 تم التسليم (مع صورة إثبات)',
        deliverNoPhoto: 'تعذر التصوير؟ تأكيد التسليم فقط',
        onTheWayWa: '📱 واتساب: أنا بالطريق',
        onTheWayWaFull: '📱 واتساب: أنا بالطريق (مع رابط التتبع)',
        call: '📞 اتصال',
        wa: '📱 واتساب',
        navigation: '🗺️ الملاحة',
        claim: '🤲 أستلم هذا الطلب',
        confirmSorry: 'سيُعاد الطلب للمشرف لتعيين سائق آخر. متابعة الاعتذار؟',
        confirmNoPhoto: 'تأكيد التسليم بدون صورة إثبات؟',
        started: '🛵 انطلقت — بالتوفيق!',
        sorryDone: 'تم الاعتذار وإرجاع الطلب للمشرف',
        deliveredDone: '🎉 تم التسليم',
        deliveredWithPhoto: '🎉 تم التسليم مع صورة الإثبات'
      },
      info: {
        customer: 'العميل',
        address: 'العنوان',
        amountToCollect: 'استلم عند التسليم',
        deliveryFee: 'أجرة',
        noGpsWarning: '⚠️ بدون موقع GPS — تواصل مع العميل',
        branchName: 'فرع'
      },
      empty: {
        noActive: 'لا يوجد توصيل نشط حالياً — بانتظار إسناد طلب جديد 🕐',
        noPool: 'لا توجد طلبات متاحة في الفرع حالياً 🕐',
        noHistory: 'لا توجد توصيلات مكتملة بعد'
      },
      lastDelivery: {
        title: '🎉 تم التسليم',
        thanks: '📱 واتساب شكر'
      },
      logoutBtn: '🚪 خروج',
      confirmLogout: 'هل تريد تسجيل الخروج؟'
    },

    /* ─── صفحة تتبع العميل ─── */
    track: {
      pageTitle: 'تتبع الطلب',
      subtitle: 'تتبع طلبك لحظة بلحظة',
      loading: 'جارٍ تحميل طلبك...',
      autoUpdate: '🔄 تحديث تلقائي كل 15 ثانية — لا تحتاج إعادة تحميل الصفحة',
      orderTypeLabel: {
        pickup: '🏪 طلب استلام من الفرع',
        delivery: '🛵 طلب توصيل'
      },
      stepsDelivery: {
        pending: 'تم استلام الطلب',
        accepted: 'تم قبول الطلب',
        preparing: 'جاري التحضير',
        ready: 'جاهز للتسليم',
        out_for_delivery: 'في الطريق إليك',
        delivered: 'تم التسليم'
      },
      stepsPickup: {
        pending: 'تم استلام الطلب',
        accepted: 'تم قبول الطلب',
        preparing: 'جاري التحضير',
        ready: 'جاهز للاستلام من الفرع',
        delivered: 'تم استلام الطلب من الفرع ✅'
      },
      icons: {
        pending: '🧾',
        accepted: '👨‍🍳',
        preparing: '🍳',
        ready: '✅',
        out_for_delivery: '🛵',
        delivered: '🎉'
      },
      branch: {
        pickup: 'استلم طلبك من هذا الفرع',
        delivery: 'فرع تحضير طلبك',
        arrival: '🗺️ الوصول',
        call: '📞'
      },
      driver: {
        label: 'سائق طلبك',
        lastUpdate: 'آخر تحديث',
        call: '📞 اتصال'
      },
      items: {
        title: '🧾 تفاصيل الطلب',
        subtotal: 'المجموع الفرعي',
        deliveryFee: 'رسوم التوصيل',
        grandTotal: 'الإجمالي (شامل الضريبة)',
        paymentLabel: '💵 الدفع',
        payCashier: 'نقداً عند الكاشير',
        payDriver: 'نقداً للسائق عند التسليم'
      },
      map: {
        title: '🗺️ خريطة التتبع المباشر',
        legend: {
          driver: '🛵 السائق',
          target: '📍 وجهتك',
          branch: '🏪 الفرع'
        },
        routeInfo: {
          remaining: '🚗 المسار المتبقي',
          km: 'كم',
          minutes: 'دقيقة',
          fastest: 'أسرع مسار',
          fallback: '📡 تعذر حساب المسار لحظياً — خط تقريبي مباشر'
        }
      },
      error: {
        noNumber: 'لا يوجد رقم طلب في الرابط',
        notFound: 'الطلب غير موجود',
        checkLink: 'تأكد من رقم الطلب أو رابط التتبع',
        network: 'تحقق من اتصالك بالإنترنت'
      },
      closed: {
        title: '🎉 تم التسليم',
        thankYou: 'شكراً لثقتك بمكرونجي 🙏',
        canClose: 'يمكنك إغلاق هذه الصفحة الآن',
        closeBtn: 'إغلاق الصفحة',
        cancelled: 'تم إلغاء هذا الطلب'
      }
    },

    /* ─── لوحة المالك ─── */
    admin: {
      pageTitle: 'لوحة المالك',
      tabs: {
        menu: 'المنيو',
        display: 'العرض',
        branches: 'الفروع',
        bestSellers: 'الأكثر مبيعاً',
        delivery: 'التوصيل والسوشيال',
        settings: 'الإعدادات',
        ad: 'الإعلان',
        users: '👥 الموظفون',
        orders: '🧾 الطلبات',
        reports: '📊 التقارير'
      },
      users: {
        addTitle: 'إضافة موظف جديد',
        listTitle: 'قائمة الموظفين',
        name: 'الاسم',
        phone: 'الجوال',
        username: 'اسم المستخدم',
        role: 'الدور',
        branch: 'الفرع',
        tempPass: 'كلمة مرور مؤقتة',
        tempGen: 'توليد تلقائي',
        create: 'إضافة',
        enable: 'تفعيل',
        disable: 'تعطيل',
        resetPass: '🔑 إعادة تعيين كلمة المرور',
        delete: '🗑 حذف',
        confirmDelete: 'سيُحذف الموظف نهائياً. اكتب delete للتأكيد.',
        ownerProtected: 'حساب المالك محمي',
        active: 'مفعّل',
        inactive: 'معطّل',
        empty: 'لا يوجد موظفون',
        roles: {
          owner: 'المالك',
          supervisor: 'مشرف',
          driver: 'سائق'
        },
        created: 'تم إنشاء الموظف',
        givePass: 'سلّم كلمة المرور للموظف الآن — لن تظهر مرة أخرى',
        deleted: 'تم الحذف'
      },
      orders: {
        title: 'كل الطلبات',
        allBranches: 'كل الفروع',
        allStatuses: 'كل الحالات',
        allTypes: 'كل الأنواع',
        pickupType: '🏪 استلام',
        deliveryType: '🛵 توصيل',
        refresh: 'تحديث',
        cashier: '💵 كاشير',
        empty: 'لا توجد طلبات',
        columns: {
          number: 'رقم الطلب',
          type: 'النوع',
          branch: 'الفرع',
          customer: 'العميل',
          phone: 'الجوال',
          total: 'الإجمالي',
          status: 'الحالة',
          driver: 'السائق',
          time: 'الوقت'
        },
        noDriver: '—'
      },
      reports: {
        title: 'التقارير والإحصائيات',
        period: 'الفترة',
        today: 'اليوم',
        week: 'آخر 7 أيام',
        month: 'آخر 30 يوم',
        show: 'عرض',
        totalOrders: 'إجمالي الطلبات',
        delivered: 'تم التسليم',
        pickupDelivered: '🏪 استلام مسلّم',
        deliveryDelivered: '🛵 توصيل مسلّم',
        cancelled: 'تم الإلغاء',
        revenue: 'الإيراد',
        avg: 'متوسط الطلب',
        driverPerf: 'أداء السائقين',
        driverName: 'السائق',
        deliveries: 'التوصيلات',
        earnings: 'الأرباح'
      },
      deliveryAvailability: {
        title: '🛵 توفر خدمة التوصيل',
        all: '🛵 التوصيل متاح في كل الفروع',
        none: '🚫 لا يوجد توصيل في أي فرع',
        selected: '🎯 فروع محددة فقط',
        selectBranches: 'اختر الفروع التي توفّر التوصيل:',
        publish: '🚀 نشر'
      },
      statuses: {
        pending: 'بانتظار القبول',
        accepted: 'تم القبول',
        preparing: 'جاري التحضير',
        ready: 'جاهز للتسليم',
        ready_pickup: 'جاهز للاستلام',
        driver_assigned: 'تم تعيين السائق',
        driver_at_restaurant: 'السائق في المطعم',
        out_for_delivery: 'في الطريق',
        delivered: 'تم التسليم',
        delivered_pickup: 'تم الاستلام ✅',
        cancelled: 'تم الإلغاء',
        archived: 'مؤرشف'
      }
    },

    /* ─── الرسائل المُرسَلة للعملاء (عربية فقط) ─── */
    messages: {
      /* ملاحظة: هذه الرسائل عربية دائماً حتى لو كانت واجهة الموظف بالإنجليزية */

      /* 1) رسالة المشرف — تأكيد الاستلام */
      supConfirm: 'أهلاً بك عزيزنا *{customer_name}* 🍝\n' +
                  'معك {supervisor_name} — مشرف فرع {branch_name} في مكرونجي\n' +
                  'نؤكد استلام طلبك رقم *{order_number}* ✅\n' +
                  'الإجمالي: {total} ريال — الدفع عند الاستلام\n' +
                  'بدأنا تحضيره الآن، وسيكون جاهزاً خلال 15–20 دقيقة\n' +
                  'نحن في خدمتك على هذا الرقم لأي طلب أو استفسار\n' +
                  '✨ شكراً لثقتك بنا — نسعد دائماً بخدمتك',

      /* 2) رسالة السائق — في الطريق */
      drvOnWay: 'أهلاً بك عزيزنا *{customer_name}* 🍝\n' +
                'معك {driver_name} من فريق توصيل مكرونجي\n' +
                'طلبك رقم *{order_number}* في الطريق إليك 🛵\n' +
                'المبلغ المستحق عند التسليم: {total} ريال\n' +
                '🗺️ تتبّع طلبك لحظياً:\n' +
                '{track_url}\n' +
                'مسافة السكة 😊',

      /* 3) رسالة السائق — بعد التسليم */
      drvThanks: 'عزيزنا *{customer_name}* 🍝\n' +
                 'تم تسليم طلبك رقم *{order_number}* بنجاح 🎉\n' +
                 'بالعافية والهناء 😋\n' +
                 'شكراً لثقتك بمكرونجي — سعدنا بخدمتك\n' +
                 'ولا تتردد بطلبنا في أي وقت 🍝',

      /* 4) رسالة الإلغاء التلقائي (مهجور) */
      autoCancel: 'نعتذر، لم يتمكن الفرع من التعامل مع طلبك في الوقت المحدد.\n' +
                  'تواصل معنا وسنخدمك فوراً 🌹',

      /* 5) رسالة السائق لطلب بدون GPS */
      drvNoGps: 'مرحباً *{customer_name}* 🍝\n' +
                'معك سائق طلبك رقم *{order_number}* من مكرونجي\n' +
                'أحتاج توضيح العنوان بدقة للوصول إليك بأسرع وقت\n' +
                'هل يمكنك إرسال موقعك الحالي؟ 📍'
    },

    /* ─── رسائل الخطأ ─── */
    errors: {
      network: 'تعذر الاتصال بالخادم — تحقق من الإنترنت',
      unauthorized: 'انتهت الجلسة — سجّل الدخول مجدداً',
      notFound: 'غير موجود',
      forbidden: 'صلاحيات غير كافية',
      serverError: 'خطأ في الخادم',
      rateLimited: 'محاولات كثيرة، حاول لاحقاً'
    },

    /* ─── زر اللغة ─── */
    langToggle: {
      ariaLabel: 'تبديل اللغة'
    }
  },

  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      close: 'Close',
      loading: 'Loading...',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      prev: 'Previous',
      search: 'Search',
      filter: 'Filter',
      refresh: 'Refresh',
      logout: 'Logout',
      login: 'Login',
      settings: 'Settings',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      currency: 'SAR',
      date: 'Date',
      time: 'Time',
      branch: 'Branch',
      customer: 'Customer',
      driver: 'Driver',
      order: 'Order',
      total: 'Total',
      subtotal: 'Subtotal',
      status: 'Status',
      notes: 'Notes',
      phone: 'Phone',
      address: 'Address',
      amount: 'Amount',
      actions: 'Actions',
      empty: 'No data',
      connected: 'Connected',
      riyal: 'SAR'
    },

    login: {
      title: 'Staff Login',
      subtitle: 'Branch supervisors & drivers only',
      username: 'Username',
      password: 'Password',
      loginBtn: 'Login',
      logging: 'Logging in...',
      changeTitle: 'Change Password',
      changeNote: 'First login detected. Choose a new password: at least 8 characters, with uppercase, lowercase and a number.',
      newPass: 'New Password',
      confirmPass: 'Confirm Password',
      savePass: 'Save & Continue',
      saving: 'Saving...',
      brand: 'Makaronjy',
      rights: 'All rights reserved',
      errEmpty: '⚠️ Enter username and password',
      errPassMismatch: '⚠️ Passwords do not match',
      errPassWeak: '⚠️ Weak password: 8 chars + uppercase + lowercase + number',
      okChanged: '✅ Password changed successfully',
      errNetwork: '⚠️ Cannot connect to server — check your internet',
      errUnknown: '⚠️ Unknown error'
    },

    supervisor: {
      pageTitle: 'Branch Supervisor Panel',
      sections: {
        newOrders: 'New Orders',
        inProgress: 'In Progress',
        activeDelivery: 'Active Deliveries',
        deliveredToday: 'Delivered Today'
      },
      stats: {
        todayOrders: "Today's Orders",
        todayRevenue: "Today's Revenue (SAR)",
        availableDrivers: 'Available Drivers'
      },
      actions: {
        confirm: '✅ Confirm',
        reject: '❌ Reject',
        preparing: '👨‍🍳 Preparing',
        ready: '📦 Order Ready',
        readyForPickup: '📦 Ready for Pickup',
        sendToPool: '📦 Send to Drivers',
        assignDriver: '🚗 Assign',
        chooseDriver: '— Choose driver —',
        pickupFromBranch: '✅ Picked up by customer',
        pickupHint: '💵 Collect',
        atCashier: 'SAR at cashier',
        waVerify: '📱 WhatsApp Verify',
        viewMap: 'View on Map',
        openTracking: '🔎 Open Customer Tracking',
        driverLocation: '🗺️ Driver Location',
        unknownDriver: 'Unknown Driver',
        confirmReject: 'Are you sure you want to reject this order?',
        confirmPickup: 'Confirm order closed?\n(Customer picked up from branch)'
      },
      badges: {
        pickup: '🏪 Pickup',
        delivery: '🛵 Delivery',
        payment: {
          atCashier: 'At cashier 🏪',
          cod: 'Cash on Delivery',
          card: 'Card'
        }
      },
      labels: {
        orderNum: 'Order #',
        customer: 'Customer',
        total: 'Total',
        status: 'Status',
        address: 'Address',
        items: 'Items',
        driver: 'Driver',
        payment: 'Payment',
        branch: 'Branch'
      },
      empty: {
        newOrders: 'No new orders right now 📭',
        inProgress: 'No orders in progress',
        activeDelivery: 'No active deliveries',
        deliveredToday: 'No orders delivered yet'
      },
      toast: {
        statusUpdated: 'Status updated ✅',
        driverAssigned: 'Driver assigned 🚗',
        chooseDriverFirst: '⚠️ Choose a driver first',
        updateFailed: 'Update failed — retrying'
      },
      report: {
        title: '🍝 Makaronjy — Branch Report',
        date: 'Date',
        totalOrders: 'Total Orders',
        delivered: 'Delivered',
        revenue: 'Revenue',
        fees: 'Delivery Fees',
        savePdfHint: 'To save as PDF: choose "Save as PDF" from print dialog',
        columns: {
          orderNum: 'Order #',
          type: 'Type',
          customer: 'Customer',
          phone: 'Phone',
          total: 'Total',
          status: 'Status',
          driver: 'Driver'
        }
      },
      confirmLogout: 'Are you sure you want to logout?'
    },

    driver: {
      pageTitle: 'Driver Portal',
      login: {
        title: '🚗 Driver Portal',
        subtitle: 'Makaronjy — login to start delivering',
        placeholderUser: 'Username',
        placeholderPass: 'Password',
        loginBtn: 'Login',
        errEmpty: 'Please fill in all fields',
        errNotDriver: 'This is not a driver account',
        errFailed: 'Login failed'
      },
      stats: {
        todayDeliveries: "Today's Deliveries",
        todayEarnings: "Today's Earnings (SAR)"
      },
      sections: {
        currentDelivery: '🚗 Current Delivery',
        availablePool: '📦 Available Orders',
        history: '📜 Delivery History'
      },
      steps: {
        assigned: 'Assigned',
        onTheWay: 'On the Way',
        delivered: 'Delivered'
      },
      actions: {
        startDelivery: '🛵 Start Delivery',
        sorry: '❌ Decline',
        deliverWithPhoto: '🎉 Delivered (with photo)',
        deliverNoPhoto: 'No photo? Confirm delivery only',
        onTheWayWa: '📱 WhatsApp: On the Way',
        onTheWayWaFull: '📱 WhatsApp: On the Way (with tracking link)',
        call: '📞 Call',
        wa: '📱 WhatsApp',
        navigation: '🗺️ Navigate',
        claim: '🤲 Claim This Order',
        confirmSorry: 'Order will be sent back to supervisor. Continue?',
        confirmNoPhoto: 'Confirm delivery without photo proof?',
        started: '🛵 Started — good luck!',
        sorryDone: 'Declined — order returned to supervisor',
        deliveredDone: '🎉 Delivered',
        deliveredWithPhoto: '🎉 Delivered with photo proof'
      },
      info: {
        customer: 'Customer',
        address: 'Address',
        amountToCollect: 'Collect on delivery',
        deliveryFee: 'Fee',
        noGpsWarning: '⚠️ No GPS — contact customer',
        branchName: 'Branch'
      },
      empty: {
        noActive: 'No active delivery — waiting for new order 🕐',
        noPool: 'No available orders in branch 🕐',
        noHistory: 'No completed deliveries yet'
      },
      lastDelivery: {
        title: '🎉 Delivered',
        thanks: '📱 Send Thanks'
      },
      logoutBtn: '🚪 Logout',
      confirmLogout: 'Are you sure you want to logout?'
    },

    track: {
      pageTitle: 'Order Tracking',
      subtitle: 'Track your order in real-time',
      loading: 'Loading your order...',
      autoUpdate: '🔄 Auto-refresh every 15 seconds — no need to reload',
      orderTypeLabel: {
        pickup: '🏪 Branch Pickup',
        delivery: '🛵 Delivery Order'
      },
      stepsDelivery: {
        pending: 'Order Received',
        accepted: 'Order Accepted',
        preparing: 'Preparing',
        ready: 'Ready for Delivery',
        out_for_delivery: 'On the Way',
        delivered: 'Delivered'
      },
      stepsPickup: {
        pending: 'Order Received',
        accepted: 'Order Accepted',
        preparing: 'Preparing',
        ready: 'Ready for Pickup',
        delivered: 'Picked up from Branch ✅'
      },
      icons: {
        pending: '🧾',
        accepted: '👨‍🍳',
        preparing: '🍳',
        ready: '✅',
        out_for_delivery: '🛵',
        delivered: '🎉'
      },
      branch: {
        pickup: 'Pick up your order from this branch',
        delivery: 'Branch preparing your order',
        arrival: '🗺️ Directions',
        call: '📞'
      },
      driver: {
        label: 'Your Driver',
        lastUpdate: 'Last update',
        call: '📞 Call'
      },
      items: {
        title: '🧾 Order Details',
        subtotal: 'Subtotal',
        deliveryFee: 'Delivery Fee',
        grandTotal: 'Total (incl. tax)',
        paymentLabel: '💵 Payment',
        payCashier: 'Cash at cashier',
        payDriver: 'Cash to driver on delivery'
      },
      map: {
        title: '🗺️ Live Tracking Map',
        legend: {
          driver: '🛵 Driver',
          target: '📍 Your location',
          branch: '🏪 Branch'
        },
        routeInfo: {
          remaining: '🚗 Remaining route',
          km: 'km',
          minutes: 'min',
          fastest: 'fastest route',
          fallback: '📡 Route calculation failed — showing direct line'
        }
      },
      error: {
        noNumber: 'No order number in URL',
        notFound: 'Order not found',
        checkLink: 'Check your order number or tracking link',
        network: 'Check your internet connection'
      },
      closed: {
        title: '🎉 Delivered',
        thankYou: 'Thank you for choosing Makaronjy 🙏',
        canClose: 'You can close this page now',
        closeBtn: 'Close Page',
        cancelled: 'This order was cancelled'
      }
    },

    admin: {
      pageTitle: 'Owner Dashboard',
      tabs: {
        menu: 'Menu',
        display: 'Display',
        branches: 'Branches',
        bestSellers: 'Best Sellers',
        delivery: 'Delivery & Social',
        settings: 'Settings',
        ad: 'Advertisement',
        users: '👥 Staff',
        orders: '🧾 Orders',
        reports: '📊 Reports'
      },
      users: {
        addTitle: 'Add New Staff',
        listTitle: 'Staff List',
        name: 'Name',
        phone: 'Phone',
        username: 'Username',
        role: 'Role',
        branch: 'Branch',
        tempPass: 'Temp Password',
        tempGen: 'Auto-generate',
        create: 'Add',
        enable: 'Enable',
        disable: 'Disable',
        resetPass: '🔑 Reset Password',
        delete: '🗑 Delete',
        confirmDelete: 'Staff will be permanently deleted. Type delete to confirm.',
        ownerProtected: 'Owner account is protected',
        active: 'Active',
        inactive: 'Inactive',
        empty: 'No staff members',
        roles: {
          owner: 'Owner',
          supervisor: 'Supervisor',
          driver: 'Driver'
        },
        created: 'Staff member created',
        givePass: 'Give this password to the staff member — it will not be shown again',
        deleted: 'Deleted'
      },
      orders: {
        title: 'All Orders',
        allBranches: 'All Branches',
        allStatuses: 'All Statuses',
        allTypes: 'All Types',
        pickupType: '🏪 Pickup',
        deliveryType: '🛵 Delivery',
        refresh: 'Refresh',
        cashier: '💵 Cashier',
        empty: 'No orders',
        columns: {
          number: 'Order #',
          type: 'Type',
          branch: 'Branch',
          customer: 'Customer',
          phone: 'Phone',
          total: 'Total',
          status: 'Status',
          driver: 'Driver',
          time: 'Time'
        },
        noDriver: '—'
      },
      reports: {
        title: 'Reports & Statistics',
        period: 'Period',
        today: 'Today',
        week: 'Last 7 days',
        month: 'Last 30 days',
        show: 'Show',
        totalOrders: 'Total Orders',
        delivered: 'Delivered',
        pickupDelivered: '🏪 Pickup Delivered',
        deliveryDelivered: '🛵 Delivery Delivered',
        cancelled: 'Cancelled',
        revenue: 'Revenue',
        avg: 'Average Order',
        driverPerf: 'Driver Performance',
        driverName: 'Driver',
        deliveries: 'Deliveries',
        earnings: 'Earnings'
      },
      deliveryAvailability: {
        title: '🛵 Delivery Availability',
        all: '🛵 Available in all branches',
        none: '🚫 No delivery in any branch',
        selected: '🎯 Selected branches only',
        selectBranches: 'Select branches with delivery:',
        publish: '🚀 Publish'
      },
      statuses: {
        pending: 'Pending',
        accepted: 'Accepted',
        preparing: 'Preparing',
        ready: 'Ready',
        ready_pickup: 'Ready for Pickup',
        driver_assigned: 'Driver Assigned',
        driver_at_restaurant: 'Driver at Restaurant',
        out_for_delivery: 'On the Way',
        delivered: 'Delivered',
        delivered_pickup: 'Picked up ✅',
        cancelled: 'Cancelled',
        archived: 'Archived'
      }
    },

    /* ملاحظة: الرسائل تبقى عربية حتى في الواجهة الإنجليزية */
    messages: {
      supConfirm: 'Hello dear *{customer_name}* 🍝\n' +
                  'This is {supervisor_name} — supervisor of {branch_name} branch at Makaronjy\n' +
                  'We confirm your order *{order_number}* ✅\n' +
                  'Total: {total} SAR — Cash on pickup\n' +
                  'We are preparing it now, ready in 15–20 minutes\n' +
                  "We're here for any request or inquiry\n" +
                  '✨ Thank you for your trust — we are always happy to serve you',

      drvOnWay: 'Hello dear *{customer_name}* 🍝\n' +
                'This is {driver_name} from Makaronjy delivery team\n' +
                'Your order *{order_number}* is on the way 🛵\n' +
                'Amount due on delivery: {total} SAR\n' +
                '🗺️ Track your order live:\n' +
                '{track_url}\n' +
                'See you soon 😊',

      drvThanks: 'Dear *{customer_name}* 🍝\n' +
                 'Your order *{order_number}* has been delivered 🎉\n' +
                 'Bon appétit 😋\n' +
                 'Thank you for choosing Makaronjy — happy to serve you\n' +
                 "Don't hesitate to order anytime 🍝",

      autoCancel: "We apologize — the branch couldn't handle your order in time.\n" +
                  'Contact us and we will serve you immediately 🌹',

      drvNoGps: 'Hello *{customer_name}* 🍝\n' +
                'This is your driver for order *{order_number}* from Makaronjy\n' +
                'I need a clear address to reach you quickly\n' +
                'Can you send your current location? 📍'
    },

    errors: {
      network: 'Cannot connect to server — check your internet',
      unauthorized: 'Session expired — please login again',
      notFound: 'Not found',
      forbidden: 'Insufficient permissions',
      serverError: 'Server error',
      rateLimited: 'Too many attempts, try again later'
    },

    langToggle: {
      ariaLabel: 'Switch language'
    }
  }
};

/* ═══════════════════════════════════════════
   الدوال العامة
   ═══════════════════════════════════════════ */

/* اللغة الحالية */
function getStaffLang() {
  try {
    const saved = localStorage.getItem('mk_staff_lang');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch (e) {}
  return 'ar';
}

function setStaffLang(lang) {
  if (lang !== 'ar' && lang !== 'en') lang = 'ar';
  try { localStorage.setItem('mk_staff_lang', lang); } catch (e) {}
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
  applyStaffI18n();
  updateLangToggleUI();
  /* إطلاق حدث لإعلام الصفحات المفتوحة */
  try {
    window.dispatchEvent(new CustomEvent('staff-lang-changed', { detail: { lang: lang } }));
  } catch (e) {}
}

/* جلب قيمة من القاموس بمفتاح نقطي: 'supervisor.actions.confirm' */
function getStaffTranslation(key, lang) {
  lang = lang || getStaffLang();
  const dict = window.STAFF_I18N[lang];
  if (!dict) return null;
  const parts = key.split('.');
  let node = dict;
  for (let i = 0; i < parts.length; i++) {
    if (node == null || typeof node !== 'object') return null;
    node = node[parts[i]];
  }
  return (typeof node === 'string') ? node : null;
}

/* دالة الترجمة الرئيسية مع دعم المتغيرات */
function tt(key, params, fallbackLang) {
  let text = getStaffTranslation(key, getStaffLang());
  if (text == null) {
    /* fallback للعربية */
    text = getStaffTranslation(key, 'ar');
  }
  if (text == null) {
    /* fallback للمفتاح نفسه */
    return key;
  }
  if (params && typeof params === 'object') {
    /* استبدال {var} بالقيم */
    text = text.replace(/\{(\w+)\}/g, function(match, varName) {
      return (params[varName] !== undefined && params[varName] !== null)
        ? String(params[varName])
        : match;
    });
  }
  return text;
}

/* تطبيق الترجمات على عناصر data-t */
function applyStaffI18n() {
  const lang = getStaffLang();
  document.querySelectorAll('[data-t]').forEach(function(el) {
    const key = el.getAttribute('data-t');
    const text = tt(key);
    if (text !== key) {
      /* دعم data-t-attr لترجمة السمات (placeholder/title) */
      el.textContent = text;
    }
  });
  /* ترجمة السمات: data-t-placeholder="key" */
  document.querySelectorAll('[data-t-placeholder]').forEach(function(el) {
    const key = el.getAttribute('data-t-placeholder');
    const text = tt(key);
    if (text !== key) el.placeholder = text;
  });
  document.querySelectorAll('[data-t-title]').forEach(function(el) {
    const key = el.getAttribute('data-t-title');
    const text = tt(key);
    if (text !== key) el.title = text;
  });
}

/* إنشاء زر اللغة الموحد في أي عنصر مضيف */
function renderLangToggle(hostId) {
  const host = hostId ? document.getElementById(hostId) : document.body;
  if (!host) return;
  if (host.querySelector('.staff-lang-toggle')) return;

  const wrap = document.createElement('div');
  wrap.className = 'staff-lang-toggle';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', tt('langToggle.ariaLabel'));
  wrap.innerHTML =
    '<button type="button" class="sl-btn" data-lang="ar">AR</button>' +
    '<button type="button" class="sl-btn" data-lang="en">EN</button>';

  /* الأنماط — تُحقن مرة واحدة */
  if (!document.getElementById('staff-lang-toggle-style')) {
    const style = document.createElement('style');
    style.id = 'staff-lang-toggle-style';
    style.textContent =
      '.staff-lang-toggle{position:fixed;top:.8rem;inset-inline-end:.8rem;z-index:9999;' +
      'display:inline-flex;background:rgba(0,0,0,.06);border:1px solid rgba(234,223,210,.8);' +
      'border-radius:50px;padding:3px;gap:2px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
      'box-shadow:0 4px 12px rgba(0,0,0,.08)}' +
      '.staff-lang-toggle .sl-btn{padding:.3rem .75rem;border-radius:50px;border:none;' +
      'background:transparent;color:#8a6f63;font-family:inherit;font-weight:900;font-size:.75rem;' +
      'cursor:pointer;transition:.2s}' +
      '.staff-lang-toggle .sl-btn:hover{color:#5a1830}' +
      '.staff-lang-toggle .sl-btn.active{background:linear-gradient(135deg,#e0912f,#f2b95f);' +
      'color:#5a1830;box-shadow:0 2px 6px rgba(224,145,47,.4)}';
    document.head.appendChild(style);
  }

  host.appendChild(wrap);

  wrap.addEventListener('click', function(e) {
    const btn = e.target.closest('.sl-btn');
    if (!btn) return;
    const lang = btn.getAttribute('data-lang');
    if (lang) setStaffLang(lang);
  });

  updateLangToggleUI();
}

function updateLangToggleUI() {
  const lang = getStaffLang();
  document.querySelectorAll('.staff-lang-toggle .sl-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

/* التهيئة الرئيسية — تُستدعى في نهاية كل صفحة */
function initStaffI18n(options) {
  options = options || {};
  /* تطبيق اللغة على الصفحة */
  setStaffLang(getStaffLang());

  /* إنشاء زر اللغة تلقائياً في body إن لم يُحدد مضيف */
  if (options.autoLangToggle !== false) {
    const hostId = options.langToggleHost || null;
    renderLangToggle(hostId);
  }

  /* مزامنة بين التبويبات */
  window.addEventListener('storage', function(e) {
    if (e.key === 'mk_staff_lang') {
      setStaffLang(e.newValue || 'ar');
    }
  });
}

/* جعل الدوال متاحة عالمياً */
window.getStaffLang = getStaffLang;
window.setStaffLang = setStaffLang;
window.getStaffTranslation = getStaffTranslation;
window.tt = tt;
window.applyStaffI18n = applyStaffI18n;
window.renderLangToggle = renderLangToggle;
window.initStaffI18n = initStaffI18n;

/* ═══════════════════════════════════════════
   نهاية i18n-staff.js (v1.0)
   ═══════════════════════════════════════════ */
