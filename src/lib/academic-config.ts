export type AcademicMapelConfig = {
  nama_indo: string;
  nama_arab: string;
  bobot?: number;
  bobot_usbu?: number;
  masuk_akumulasi?: boolean;
  tampil_di_syahadah?: boolean;
  jumlah_tes?: number;
};

export type AcademicProgramConfig = {
  nama_indo: string;
  nama_arab: string;
  kkm: number;
  mapel: AcademicMapelConfig[];
};

export const PROGRAM_SEED_DATA: AcademicProgramConfig[] = [
  {
    nama_indo: "Shifr",
    nama_arab: "صفر",
    kkm: 60,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور", bobot_usbu: 10, bobot: 10 },
      { nama_indo: "Istima'", nama_arab: "الاستماع", bobot_usbu: 18, bobot: 16 },
      { nama_indo: "Kalam", nama_arab: "الكلام", bobot_usbu: 18, bobot: 16 },
      { nama_indo: "Anashir Al-Lughah", nama_arab: "عناصر اللغة", bobot_usbu: 18, bobot: 16 },
      { nama_indo: "Qiraah", nama_arab: "القراءة", bobot_usbu: 18, bobot: 16 },
      { nama_indo: "Kitabah", nama_arab: "الكتابة", bobot_usbu: 18, bobot: 16 },
      { nama_indo: "Mufradat", nama_arab: "المفردات", bobot_usbu: 0, bobot: 10 }
    ]
  },
  {
    nama_indo: "I'dad Awal",
    nama_arab: "إعداد أول",
    kkm: 60,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور", bobot_usbu: 10, bobot: 10 },
      { nama_indo: "Kalam", nama_arab: "الكلام", bobot_usbu: 25, bobot: 30 },
      { nama_indo: "Mufradat", nama_arab: "المفردات", bobot_usbu: 20, bobot: 20 },
      { nama_indo: "Ta'birat", nama_arab: "التعبيرات", bobot_usbu: 25, bobot: 20 },
      { nama_indo: "Qawaid", nama_arab: "القواعد", bobot_usbu: 20, bobot: 20 },
      { nama_indo: "Vlog", nama_arab: "الفلوغ", bobot_usbu: 0, bobot: 0, masuk_akumulasi: false }
    ]
  },
  {
    nama_indo: "I'dad Tsani",
    nama_arab: "إعداد ثاني",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور", bobot_usbu: 10, bobot: 10 },
      { nama_indo: "Kalam", nama_arab: "الكلام", bobot_usbu: 25, bobot: 25 },
      { nama_indo: "Kitabah", nama_arab: "الكتابة", bobot_usbu: 20, bobot: 20 },
      { nama_indo: "Ta'birat", nama_arab: "التعبيرات", bobot_usbu: 20, bobot: 20 },
      { nama_indo: "Qawaid", nama_arab: "القواعد", bobot_usbu: 15, bobot: 15 },
      { nama_indo: "Mufradat", nama_arab: "المفردات", bobot_usbu: 10, bobot: 10 }
    ]
  },
  {
    nama_indo: "Syarqi Awwal",
    nama_arab: "شرقي أول",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور", bobot_usbu: 10, bobot: 10 },
      { nama_indo: "Kalam", nama_arab: "الكلام", bobot_usbu: 25, bobot: 30 },
      { nama_indo: "Qiraah", nama_arab: "القراءة", bobot_usbu: 20, bobot: 20 },
      { nama_indo: "Istima'", nama_arab: "الاستماع", bobot_usbu: 18, bobot: 15 },
      { nama_indo: "Tarakib", nama_arab: "التراكيب", bobot_usbu: 17, bobot: 15 },
      { nama_indo: "Qiraah Al-Akhbar", nama_arab: "قراءة الأخبار", bobot_usbu: 0, bobot: 10 },
      { nama_indo: "Mufradat", nama_arab: "المفردات", bobot_usbu: 10, bobot: 10 }
    ]
  },
  {
    nama_indo: "Syarqi Tsany",
    nama_arab: "شرقي ثاني",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور", bobot_usbu: 10, bobot: 10 },
      { nama_indo: "Kalam", nama_arab: "الكلام", bobot_usbu: 25, bobot: 25 },
      { nama_indo: "Kitabah", nama_arab: "الكتابة", bobot_usbu: 20, bobot: 20 },
      { nama_indo: "Qawaid", nama_arab: "القواعد", bobot_usbu: 15, bobot: 20 },
      { nama_indo: "Balaghah", nama_arab: "البلاغة", bobot_usbu: 10, bobot: 15 },
      { nama_indo: "Mufradat", nama_arab: "المفردات", bobot_usbu: 20, bobot: 10 }
    ]
  },
  {
    nama_indo: "Atiqah",
    nama_arab: "عتيقة",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور", bobot_usbu: 10, bobot: 10 },
      { nama_indo: "Qiraah", nama_arab: "القراءة", bobot_usbu: 45, bobot: 35 },
      { nama_indo: "Qawaid", nama_arab: "القواعد", bobot_usbu: 45, bobot: 35 },
      { nama_indo: "Sharf", nama_arab: "الصرف", bobot_usbu: 0, bobot: 20 }
    ]
  },
  {
    nama_indo: "Takhasus Awal",
    nama_arab: "تخصص أول",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور", bobot_usbu: 10, bobot: 0 },
      { nama_indo: "Qiraah", nama_arab: "القراءة", bobot_usbu: 30, bobot: 20 },
      { nama_indo: "Nahwu", nama_arab: "النحو", bobot_usbu: 25, bobot: 25 },
      { nama_indo: "Sharf", nama_arab: "الصرف", bobot_usbu: 20, bobot: 20 },
      { nama_indo: "I'lal", nama_arab: "الإعلال", bobot_usbu: 15, bobot: 15 },
      { nama_indo: "Nadzam", nama_arab: "النظم", bobot_usbu: 0, bobot: 10 }
    ]
  },
  {
    nama_indo: "Takhasus Tsani",
    nama_arab: "تخصص ثاني",
    kkm: 50,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور", bobot_usbu: 10, bobot: 0 },
      { nama_indo: "Qiraah", nama_arab: "القراءة", bobot_usbu: 30, bobot: 20 },
      { nama_indo: "Nahwu", nama_arab: "النحو", bobot_usbu: 25, bobot: 25 },
      { nama_indo: "Sharf", nama_arab: "الصرف", bobot_usbu: 20, bobot: 18 },
      { nama_indo: "I'rab", nama_arab: "الإعراب", bobot_usbu: 15, bobot: 17 },
      { nama_indo: "Nadzam", nama_arab: "النظم", bobot_usbu: 0, bobot: 10 }
    ]
  },
  {
    nama_indo: "Akbarnas",
    nama_arab: "أكبرناس",
    kkm: 60,
    mapel: [
      { nama_indo: "Presensi", nama_arab: "الحضور", bobot_usbu: 10, bobot: 5 },
      { nama_indo: "Kalam", nama_arab: "الكلام", bobot_usbu: 30, bobot: 37 },
      { nama_indo: "Istima'", nama_arab: "الاستماع", bobot_usbu: 20, bobot: 9 },
      { nama_indo: "Uslub", nama_arab: "الأسلوب", bobot_usbu: 15, bobot: 15 },
      { nama_indo: "Mufradat", nama_arab: "المفردات", bobot_usbu: 10, bobot: 8 },
      { nama_indo: "Ta'birat", nama_arab: "التعبيرات", bobot_usbu: 15, bobot: 8 },
      { nama_indo: "Qawaid", nama_arab: "القواعد", bobot_usbu: 15, bobot: 9 },
      { nama_indo: "Hiwar", nama_arab: "الحوار", bobot_usbu: 20, bobot: 9 },
      { nama_indo: "Arabiyah Lin Nasyiin", nama_arab: "العربية للناشئين", bobot_usbu: 15, bobot: 0 },
      { nama_indo: "MC", nama_arab: "إم سي", bobot_usbu: 0, bobot: 0, masuk_akumulasi: false },
      { nama_indo: "Dubbing", nama_arab: "الدبلجة", bobot_usbu: 0, bobot: 0, masuk_akumulasi: false },
      { nama_indo: "Taqdimul Qishah", nama_arab: "تقديم القصة", bobot_usbu: 0, bobot: 0, masuk_akumulasi: false }
    ]
  }
];
