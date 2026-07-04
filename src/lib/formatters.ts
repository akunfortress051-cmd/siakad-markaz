import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر"
];
const INDO_MONTHS: Record<string, number> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
};

const PREDIKAT_LABELS = {
  imtiyaz: { indo: "Imtiyaz", arab: "الامتياز" },
  jayyidJiddan: { indo: "Jayyid Jiddan", arab: "جيد جدا" },
  jayyid: { indo: "Jayyid", arab: "جيد" },
  maqbul: { indo: "Maqbul", arab: "مقبول" }
} as const;

const PREDIKAT_LABELS_TURATS = {
  imtiyaz: { indo: "Istimewa", arab: "الامتياز" },
  jayyidJiddan: { indo: "Baik Sekali", arab: "جيد جدا" },
  jayyid: { indo: "Baik", arab: "جيد" },
  maqbul: { indo: "Cukup", arab: "مقبول" }
} as const;

export function convertToArabicNumerals(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)] ?? digit);
}

export function translateDufahToArabic(dufahName: string | null): string {
  if (!dufahName) return "";
  const digits = dufahName.replace(/\D/g, "");
  const arabicDigits = convertToArabicNumerals(digits);
  return `الدفعة ${arabicDigits}`;
}

export function translateDateToArabic(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = convertToArabicNumerals(date.getDate());
  const month = ARABIC_MONTHS[date.getMonth()] ?? "";
  const year = convertToArabicNumerals(date.getFullYear());

  return `${day} ${month} ${year}`;
}

export function formatDateIndo(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return format(date, "dd MMMM yyyy", { locale: localeId });
}

export function parseIndoDateString(value: string): Date | null {
  const normalized = value.trim().toLowerCase();
  const [dayRaw, monthRaw, yearRaw] = normalized.split(/\s+/);

  if (!dayRaw || !monthRaw || !yearRaw) {
    return null;
  }

  const day = Number(dayRaw);
  const month = INDO_MONTHS[monthRaw];
  const year = Number(yearRaw);

  if (!Number.isInteger(day) || month === undefined || !Number.isInteger(year)) {
    return null;
  }

  const parsed = new Date(year, month, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDateInputValue(dateInput: string | Date | null | undefined): string {
  if (!dateInput) {
    return "";
  }

  const parsed =
    dateInput instanceof Date
      ? dateInput
      : parseIndoDateString(dateInput) ?? new Date(dateInput);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return format(parsed, "yyyy-MM-dd");
}

export function getPredikat(skor: number) {
  if (skor >= 90) {
    return PREDIKAT_LABELS.imtiyaz;
  }

  if (skor >= 80) {
    return PREDIKAT_LABELS.jayyidJiddan;
  }

  if (skor >= 70) {
    return PREDIKAT_LABELS.jayyid;
  }

  return PREDIKAT_LABELS.maqbul;
}

export function getPredikatTurats(skor: number) {
  if (skor >= 90) {
    return PREDIKAT_LABELS_TURATS.imtiyaz;
  }

  if (skor >= 80) {
    return PREDIKAT_LABELS_TURATS.jayyidJiddan;
  }

  if (skor >= 70) {
    return PREDIKAT_LABELS_TURATS.jayyid;
  }

  return PREDIKAT_LABELS_TURATS.maqbul;
}
