export interface JuzMeta {
  juz: number;
  nameAr: string;
  nameEn: string;
  startSurah: number;
  startAyah: number;
  startPage: number;
}

export const TOTAL_QURAN_PAGES = 604;

// Standard Madani Mushaf Juz starting points (1..30)
export const JUZ_DATA: JuzMeta[] = [
  {juz: 1, nameAr: 'الم', nameEn: 'Alif-Lam-Mim', startSurah: 1, startAyah: 1, startPage: 1},
  {juz: 2, nameAr: 'سيقول', nameEn: 'Sayaqul', startSurah: 2, startAyah: 142, startPage: 22},
  {juz: 3, nameAr: 'تلك الرسل', nameEn: 'Tilkal-Rusul', startSurah: 2, startAyah: 253, startPage: 42},
  {juz: 4, nameAr: 'لن تنالوا', nameEn: 'Lan Tanaloo', startSurah: 3, startAyah: 93, startPage: 62},
  {juz: 5, nameAr: 'والمحصنات', nameEn: 'Wal-Muhsanat', startSurah: 4, startAyah: 24, startPage: 82},
  {juz: 6, nameAr: 'لا يحب الله', nameEn: 'La Yuhibbullah', startSurah: 4, startAyah: 148, startPage: 102},
  {juz: 7, nameAr: 'وإذا سمعوا', nameEn: 'Wa Iza Samiu', startSurah: 5, startAyah: 82, startPage: 121},
  {juz: 8, nameAr: 'ولو أننا', nameEn: 'Wa Lau Annana', startSurah: 6, startAyah: 111, startPage: 142},
  {juz: 9, nameAr: 'قال الملأ', nameEn: 'Qalal-Malao', startSurah: 7, startAyah: 88, startPage: 162},
  {juz: 10, nameAr: 'واعلموا', nameEn: 'Wa-Alamu', startSurah: 8, startAyah: 41, startPage: 182},
  {juz: 11, nameAr: 'يعتذرون', nameEn: 'Yataziruna', startSurah: 9, startAyah: 93, startPage: 201},
  {juz: 12, nameAr: 'وما من دابة', nameEn: 'Wa Ma Min Dabbah', startSurah: 11, startAyah: 6, startPage: 222},
  {juz: 13, nameAr: 'وما أبرئ', nameEn: 'Wa Ma Ubarrio', startSurah: 12, startAyah: 53, startPage: 242},
  {juz: 14, nameAr: 'ربما', nameEn: 'Rubama', startSurah: 15, startAyah: 1, startPage: 262},
  {juz: 15, nameAr: 'سبحان الذي', nameEn: 'Subhanallazi', startSurah: 17, startAyah: 1, startPage: 282},
  {juz: 16, nameAr: 'قال ألم', nameEn: 'Qal Alam', startSurah: 18, startAyah: 75, startPage: 302},
  {juz: 17, nameAr: 'اقترب للناس', nameEn: 'Iqtaraba', startSurah: 21, startAyah: 1, startPage: 322},
  {juz: 18, nameAr: 'قد أفلح', nameEn: 'Qad Aflaha', startSurah: 23, startAyah: 1, startPage: 342},
  {juz: 19, nameAr: 'وقال الذين', nameEn: 'Wa Qalallazina', startSurah: 25, startAyah: 21, startPage: 362},
  {juz: 20, nameAr: 'أمن خلق', nameEn: 'Amman Khalaq', startSurah: 27, startAyah: 56, startPage: 382},
  {juz: 21, nameAr: 'اتل ما أوحي', nameEn: 'Utlu Ma Uhiya', startSurah: 29, startAyah: 46, startPage: 402},
  {juz: 22, nameAr: 'ومن يقنت', nameEn: 'Wa Man Yaqnut', startSurah: 33, startAyah: 31, startPage: 422},
  {juz: 23, nameAr: 'وما لي', nameEn: 'Wa Mali', startSurah: 36, startAyah: 28, startPage: 442},
  {juz: 24, nameAr: 'فمن أظلم', nameEn: 'Faman Azlam', startSurah: 39, startAyah: 32, startPage: 462},
  {juz: 25, nameAr: 'إليه يرد', nameEn: 'Ilaihi Yuraddu', startSurah: 41, startAyah: 47, startPage: 482},
  {juz: 26, nameAr: 'حم', nameEn: 'Ha-Mim', startSurah: 46, startAyah: 1, startPage: 502},
  {juz: 27, nameAr: 'قال فما خطبكم', nameEn: 'Qala Fama Khatbukum', startSurah: 51, startAyah: 31, startPage: 522},
  {juz: 28, nameAr: 'قد سمع الله', nameEn: 'Qad Sami Allah', startSurah: 58, startAyah: 1, startPage: 542},
  {juz: 29, nameAr: 'تبارك الذي', nameEn: 'Tabarakallazi', startSurah: 67, startAyah: 1, startPage: 562},
  {juz: 30, nameAr: 'عم يتساءلون', nameEn: 'Amma Yatasaalun', startSurah: 78, startAyah: 1, startPage: 582},
];

// Standard 15-line Madani Mushaf start pages for all 114 surahs (index 0 = Surah 1)
export const SURAH_START_PAGES: number[] = [
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208,
  221, 235, 249, 255, 262, 267, 282, 293, 305, 312,
  322, 332, 342, 350, 359, 367, 377, 385, 396, 404,
  411, 415, 418, 428, 434, 440, 446, 453, 458, 467,
  477, 483, 489, 496, 499, 502, 507, 511, 515, 518,
  520, 523, 526, 528, 531, 534, 537, 542, 545, 549,
  551, 553, 554, 556, 558, 560, 562, 564, 566, 568,
  570, 572, 574, 575, 577, 578, 580, 582, 583, 585,
  586, 587, 587, 589, 590, 591, 591, 592, 593, 594,
  595, 595, 596, 596, 597, 597, 598, 598, 599, 599,
  600, 600, 601, 601, 601, 602, 602, 602, 603, 603,
  603, 604, 604, 604,
];

export function getSurahNumberForPage(page: number): number {
  const clamped = Math.max(1, Math.min(TOTAL_QURAN_PAGES, Math.floor(page)));
  let surahNum = 1;
  for (let i = 0; i < SURAH_START_PAGES.length; i++) {
    if (SURAH_START_PAGES[i] <= clamped) {
      surahNum = i + 1;
    } else {
      break;
    }
  }
  return surahNum;
}
