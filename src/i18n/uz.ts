export const t = {
  auth: {
    blocked:
      "Siz administrator tomonidan bloklangansiz. Savollaringiz bo'lsa, institut ma'muriyatiga murojaat qiling.",
    notRegistered: "Avval ro'yxatdan o'ting: /start buyrug'ini bosing.",
    forbidden: "Kechirasiz, bu buyruq uchun sizda ruxsat yo'q.",
  },
  registration: {
    alreadyRegistered: (fullName: string) =>
      `Siz allaqachon ro'yxatdan o'tgansiz. Xush kelibsiz, ${fullName}!`,
    askFullName:
      "Assalomu alaykum! Test botiga xush kelibsiz.\n\nIltimos, to'liq ismingizni kiriting (Familiya Ism Sharif):",
    invalidFullName:
      "Ism noto'g'ri formatda kiritildi. Kamida familiya va ismingizni, faqat harflar bilan kiriting. Qaytadan urinib ko'ring:",
    askFaculty: 'Fakultetingizni tanlang:',
    askCourse: "Nechanchi kursda o'qiysiz?",
    askGroup: 'Guruhingizni tanlang:',
    noFaculties: "Hozircha tizimda fakultetlar kiritilmagan. Administratorga murojaat qiling.",
    noGroupsForSelection:
      "Kechirasiz, bu fakultet va kurs uchun guruhlar hali tizimga kiritilmagan. Administratorga murojaat qiling.",
    confirmSummary: (fullName: string, faculty: string, course: number, group: string) =>
      `Ma'lumotlaringizni tekshiring:\n\nF.I.Sh.: ${fullName}\nFakultet: ${faculty}\nKurs: ${course}\nGuruh: ${group}\n\nTasdiqlaysizmi?`,
    confirmed: "Ro'yxatdan muvaffaqiyatli o'tdingiz! Endi botning imkoniyatlaridan foydalanishingiz mumkin.",
    cancelled: "Ro'yxatdan o'tish bekor qilindi. Qayta boshlash uchun /start bosing.",
    pressButton: "Iltimos, tugmalardan birini tanlang.",
  },
  menu: {
    student: ['📝 Testlar', '📊 Natijalarim', '📈 Statistika'],
    teacher: ['🧪 Testlarim', '📥 Savol import qilish', '📊 Natijalar'],
    admin: ['👥 Foydalanuvchilar', '📢 Xabar yuborish', '📊 Statistika', '💾 Backup'],
  },
  testCreate: {
    askTitle: 'Test nomini kiriting (masalan: "1-oraliq nazorat — Aqida"):',
    invalidTitle: "Test nomi kamida 3 ta belgidan iborat bo'lishi kerak. Qaytadan kiriting:",
    askSubject: 'Fanni tanlang:',
    invalidSubjectName: 'Fan nomi juda qisqa. Qaytadan kiriting:',
    askNewSubjectName: 'Yangi fan nomini kiriting:',
    askSettings:
      "Endi test sozlamalarini quyidagi namunaga mos holda, BITTA xabarda yuboring:\n\nVaqt (daqiqa): 30\nUrinishlar soni: 1\nO'tish bali (%): 60\nAralashtirish: ha",
    invalidSettings: (msg: string) => `Xatolik: ${msg}\n\nNamunaga qarab qaytadan yuboring.`,
    pressOrType: "Iltimos, so'ralgan ma'lumotni yuboring.",
    askSchedule:
      "Test ochilish/yopilish vaqtini belgilaysizmi?\n\nKerak bo'lsa, shu namunada yuboring:\n\nOchilish: 2026-01-10 09:00\nYopilish: 2026-01-15 23:59\n\nHoziroq ochilib, muddatsiz davom etishi kerak bo'lsa — \"yo'q\" deb yozing.",
    invalidSchedule: (msg: string) => `Xatolik: ${msg}`,
    noGroups: "Tizimda hali guruhlar kiritilmagan. Administratorga murojaat qiling.",
    askGroups: 'Testni qaysi guruh(lar)ga biriktirmoqchisiz?',
    selectAtLeastOneGroup: 'Kamida bitta guruh tanlang',
    cancelled: 'Test yaratish bekor qilindi.',
    created: (title: string) => `✅ "${title}" testi yaratildi (qoralama). Endi savollarni qo'shamiz.`,
  },
  questionImport: {
    menu: "Savollarni qanday qo'shmoqchisiz?",
    manualTemplate:
      "Savolni quyidagi namunaga mos holda yuboring (to'g'ri javobni * bilan belgilang):\n\nPayg'ambarimiz qaysi shaharda tug'ilgan?\nA) Madina\nB) Makka *\nC) Toif\nD) Quddus",
    manualError: (msg: string) => `Xatolik: ${msg}\n\nNamunaga qarab qaytadan yuboring.`,
    manualAdded: (count: number) =>
      `✅ Qo'shildi. Hozircha ${count} ta savol bor. Yana yuborishingiz mumkin, yoki tugating.`,
    fileTemplate:
      "Excel (.xlsx)/CSV ustunlari: Savol | Variant A | Variant B | Variant C | Variant D | Togri\n\nWord (.docx) namunasi:\n1. Savol matni?\nA) variant\nB) variant *\nC) variant\nD) variant\n\nFaylni yuboring:",
    unsupportedFormat: "Qo'llab-quvvatlanmaydigan format. Faqat .xlsx, .csv yoki .docx yuboring.",
    fileResult: (added: number, errors: { row: number; message: string }[], total: number) =>
      `✅ ${added} ta savol qo'shildi. Jami: ${total} ta.` +
      (errors.length
        ? `\n\n⚠️ ${errors.length} ta qatorda xatolik:\n` +
          errors.slice(0, 5).map((e) => `${e.row}-qator: ${e.message}`).join('\n')
        : ''),
    needAtLeastOne: 'Nashr qilish uchun kamida bitta savol kerak.',
    published: (count: number) => `🎉 Test nashr qilindi! Jami ${count} ta savol bilan talabalarga ko'rinadi.`,
  },
  results: {
    menu: "Nimani ko'rmoqchisiz?",
    chooseTestForLive: 'Qaysi testni jonli kuzatmoqchisiz?',
    chooseTestForReport: "Qaysi test bo'yicha hisobot kerak?",
    noActiveTests: "Hozircha faol testlaringiz yo'q.",
    noTests: "Hali testlaringiz yo'q.",
    liveStatus: (inProgress: number, completed: number, total: number) =>
      `🔴 Jonli monitoring:\n\nHozir topshirmoqda: ${inProgress}\nTugatganlar: ${completed}\nJami talabalar: ${total}`,
    reportPreparing: "⏳ Hisobot tayyorlanmoqda, bir necha soniyadan so'ng yuboraman...",
    reportNoAttempts: (title: string) => `"${title}" testi uchun hali hech kim javob topshirmagan.`,
  },
  stats: {
    noAttempts: 'Hali hech qanday test topshirmagansiz.',
  },
  userManagement: {
    chooseAction: 'Qaysi amalni bajarmoqchisiz?',
    askQuery: 'Foydalanuvchini qidirish uchun Telegram ID yoki F.I.Sh (qism)ini yuboring:',
    notFound: "Hech kim topilmadi. Qaytadan urinib ko'ring, yoki /start bilan bekor qiling.",
    multipleFound: 'Bir nechta mos keluvchi topildi, birini tanlang:',
    confirm: (name: string, role: string, actionLabel: string) =>
      `${name} (hozirgi rol: ${role}) — ${actionLabel}ni tasdiqlaysizmi?`,
    cancelled: 'Bekor qilindi.',
    done: (actionLabel: string) => `✅ Bajarildi: ${actionLabel}.`,
    protectedAdmin: "Adminlarni ushbu interfeys orqali o'zgartirib bo'lmaydi.",
    promoteLabel: "o'qituvchi qilib tayinlash",
    demoteLabel: 'talaba qilib qaytarish',
    blockLabel: 'bloklash',
    unblockLabel: 'blokdan chiqarish',
  },
  broadcast: {
    chooseAudience: 'Xabarni kimlarga yubormoqchisiz?',
    askText: 'Xabar matnini yuboring:',
    confirm: (count: number, text: string) =>
      `Quyidagi xabar ${count} ta foydalanuvchiga yuboriladi:\n\n"${text}"\n\nTasdiqlaysizmi?`,
    cancelled: 'Bekor qilindi.',
    sending: '⏳ Xabar yuborilmoqda, tugagach xabar beraman.',
  },
  backup: {
    preparing: '⏳ Backup tayyorlanmoqda, tugagach yuboraman...',
  },
  dashboard: {
    title: '📊 Tizim statistikasi:',
  },
};
