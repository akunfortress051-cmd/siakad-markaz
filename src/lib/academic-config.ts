export type AcademicMapelConfig = {
  nama_indo: string;
  nama_arab: string;
};

export type AcademicKelasConfig = {
  nama_indo: string;
  nama_arab: string;
  kkm: number;
  mapel: AcademicMapelConfig[];
};

export const KELAS_SEED_DATA: AcademicKelasConfig[] = [
  {
    nama_indo: "Shifr",
    nama_arab: "صفر",
    kkm: 60,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور" },
      { nama_indo: "Istima'", nama_arab: "الاستماع" },
      { nama_indo: "Kalam", nama_arab: "الكلام" },
      { nama_indo: "Anashir Al-Lughah", nama_arab: "عناصر اللغة" },
      { nama_indo: "Qiraah", nama_arab: "القراءة" },
      { nama_indo: "Kitabah", nama_arab: "الكتابة" }
    ]
  },
  {
    nama_indo: "I'dad Awal",
    nama_arab: "إعداد أول",
    kkm: 60,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور" },
      { nama_indo: "Kalam", nama_arab: "الكلام" },
      { nama_indo: "Mufradat", nama_arab: "المفردات" },
      { nama_indo: "Ta'birat", nama_arab: "التعبيرات" },
      { nama_indo: "Qawaid", nama_arab: "القواعد" },
      { nama_indo: "Vlog", nama_arab: "الفلوغ" }
    ]
  },
  {
    nama_indo: "Akbarnas",
    nama_arab: "أكبرناس",
    kkm: 60,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور" },
      { nama_indo: "Kalam", nama_arab: "الكلام" },
      { nama_indo: "Mufradat", nama_arab: "المفردات" },
      { nama_indo: "Ta'birat", nama_arab: "التعبيرات" },
      { nama_indo: "Tarakib Tathbiqi", nama_arab: "التراكيب التطبيقية" },
      { nama_indo: "Arabiyah Lin Nasyiin", nama_arab: "العربية للناشئين" },
      { nama_indo: "Istima'", nama_arab: "الاستماع" },
      { nama_indo: "Uslub", nama_arab: "الأسلوب" },
      { nama_indo: "Al-Hiwar Al-Muyasar", nama_arab: "الحوار الميسر" },
      { nama_indo: "MC", nama_arab: "إم سي" },
      { nama_indo: "Dubbing", nama_arab: "الدبلجة" },
      { nama_indo: "Taqdimul Qishah", nama_arab: "تقديم القصة" }
    ]
  },
  {
    nama_indo: "I'dad Tsani",
    nama_arab: "إعداد ثاني",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور" },
      { nama_indo: "Kalam", nama_arab: "الكلام" },
      { nama_indo: "Mufradat", nama_arab: "المفردات" },
      { nama_indo: "Ta'birat", nama_arab: "التعبيرات" },
      { nama_indo: "Qawaid", nama_arab: "القواعد" }
    ]
  },
  {
    nama_indo: "Atiqah",
    nama_arab: "عتيقة",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور" },
      { nama_indo: "Qawaid", nama_arab: "القواعد" },
      { nama_indo: "Qiraah", nama_arab: "القراءة" },
      { nama_indo: "Tasmi'", nama_arab: "التسميع" }
    ]
  },
  {
    nama_indo: "Takhasus Awal",
    nama_arab: "تخصص أول",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور" },
      { nama_indo: "Qawaid", nama_arab: "القواعد" },
      { nama_indo: "Kalam", nama_arab: "الكلام" },
      { nama_indo: "Istima'", nama_arab: "الاستماع" },
      { nama_indo: "Qiraah", nama_arab: "القراءة" },
      { nama_indo: "Mufradat", nama_arab: "المفردات" }
    ]
  },
  {
    nama_indo: "Syarqi Awwal",
    nama_arab: "شرقي أول",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور" },
      { nama_indo: "Qawaid", nama_arab: "القواعد" },
      { nama_indo: "Kalam", nama_arab: "الكلام" },
      { nama_indo: "Istima'", nama_arab: "الاستماع" },
      { nama_indo: "Qiraah", nama_arab: "القراءة" },
      { nama_indo: "Mufradat", nama_arab: "المفردات" }
    ]
  },
  {
    nama_indo: "Takhasus Tsani",
    nama_arab: "تخصص ثاني",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور" },
      { nama_indo: "Nahwu", nama_arab: "النحو" },
      { nama_indo: "Sharf", nama_arab: "الصرف" },
      { nama_indo: "I'rab", nama_arab: "الإعراب" },
      { nama_indo: "Qiraah", nama_arab: "القراءة" },
      { nama_indo: "Nadzam 'Imrithi", nama_arab: "نظم العمريطي" }
    ]
  },
  {
    nama_indo: "Syarqi Tsany",
    nama_arab: "شرقي ثاني",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور" },
      { nama_indo: "Qawaid", nama_arab: "القواعد" },
      { nama_indo: "Kalam", nama_arab: "الكلام" },
      { nama_indo: "Balaghah", nama_arab: "البلاغة" },
      { nama_indo: "Kitabah", nama_arab: "الكتابة" },
      { nama_indo: "Mufradat", nama_arab: "المفردات" }
    ]
  }
];
