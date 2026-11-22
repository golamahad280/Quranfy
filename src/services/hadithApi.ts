import {
  AppLanguage,
  HadithCollectionInfo,
  HadithCollectionSlug,
  HadithEditionEntry,
  HadithEntry,
  HadithGrade,
  HadithSectionCache,
  HadithSectionMeta,
} from '../types/quran';
import {
  getCachedHadithSection,
  getMetaCache,
  saveCachedHadithSection,
  saveMetaCache,
} from './db';

const HADITH_CDN_BASES = [
  'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1',
  'https://fastly.jsdelivr.net/gh/fawazahmed0/hadith-api@1',
  'https://raw.githubusercontent.com/fawazahmed0/hadith-api/1',
];

const EDITIONS_CACHE_KEY = 'hadith_editions_v1';
const INFO_CACHE_KEY = 'hadith_info_v1';

const TARGET_COLLECTIONS: Array<{
  slug: HadithCollectionSlug;
  nameEn: string;
  nameAr: string;
  nameBn: string;
}> = [
  {slug: 'bukhari', nameEn: 'Sahih al-Bukhari', nameAr: 'صحيح البخاري', nameBn: 'সহীহ বুখারী'},
  {slug: 'muslim', nameEn: 'Sahih Muslim', nameAr: 'صحيح مسلم', nameBn: 'সহীহ মুসলিম'},
  {slug: 'abudawud', nameEn: 'Sunan Abu Dawud', nameAr: 'سنن أبي داود', nameBn: 'সুনান আবু দাউদ'},
  {slug: 'tirmidhi', nameEn: 'Jami at-Tirmidhi', nameAr: 'جامع الترمذي', nameBn: 'জামে তিরমিযী'},
  {slug: 'nasai', nameEn: "Sunan an-Nasa'i", nameAr: 'سنن النسائي', nameBn: 'সুনান নাসায়ী'},
  {slug: 'ibnmajah', nameEn: 'Sunan Ibn Majah', nameAr: 'سنن ابن ماجه', nameBn: 'সুনান ইবনে মাজাহ'},
  {slug: 'malik', nameEn: 'Muwatta Malik', nameAr: 'موطأ مالك', nameBn: 'মুয়াত্তা মালিক'},
];

export type HadithAudioUrlResolver = (
  collectionSlug: HadithCollectionSlug,
  hadithNumber: number,
  lang: AppLanguage
) => Promise<string | null> | string | null;

let customHadithAudioResolver: HadithAudioUrlResolver | null = null;

/**
 * Pluggable hook so a human-recited Hadith MP3 resolver can be registered later
 * without changing UI or TTS fallback components.
 */
export function registerHadithAudioResolver(resolver: HadithAudioUrlResolver | null): void {
  customHadithAudioResolver = resolver;
}

export async function resolveHadithAudioUrl(
  collectionSlug: HadithCollectionSlug,
  hadithNumber: number,
  lang: AppLanguage
): Promise<string | null> {
  if (!customHadithAudioResolver) return null;
  return customHadithAudioResolver(collectionSlug, hadithNumber, lang);
}

async function fetchJsonWithMirrors<T>(relativePath: string): Promise<T> {
  let lastError: Error | null = null;
  const cleanPath = relativePath.replace(/^\/+/, '');
  for (const base of HADITH_CDN_BASES) {
    try {
      const res = await fetch(`${base}/${cleanPath}`);
      if (!res.ok) {
        lastError = new Error(`Hadith CDN (${base}) returned ${res.status}`);
        continue;
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Network error contacting Hadith CDN');
    }
  }
  throw lastError || new Error('All Hadith CDN mirrors failed.');
}

interface RawEditionsResponse {
  [collectionKey: string]: {
    name?: string;
    collection?: HadithEditionEntry[];
  };
}

interface RawInfoResponse {
  [collectionKey: string]: {
    metadata?: {
      name?: string;
      sections?: Record<string, string>;
      section_details?: Record<
        string,
        {
          hadithnumber_first?: number;
          hadithnumber_last?: number;
        }
      >;
    };
  };
}

interface RawHadithItem {
  hadithnumber: number;
  arabicnumber?: number | string;
  text: string;
  grades?: HadithGrade[];
  reference?: {
    book?: number;
    hadith?: number;
  };
}

interface RawEditionFile {
  metadata?: {
    name?: string;
    section?: Record<string, string>;
  };
  hadiths?: RawHadithItem[];
}

export async function fetchHadithCatalog(): Promise<HadithCollectionInfo[]> {
  let editionsData = await getMetaCache<RawEditionsResponse>(EDITIONS_CACHE_KEY);
  let infoData = await getMetaCache<RawInfoResponse>(INFO_CACHE_KEY);

  if (!editionsData || !infoData) {
    const [ed, inf] = await Promise.all([
      fetchJsonWithMirrors<RawEditionsResponse>('editions.min.json'),
      fetchJsonWithMirrors<RawInfoResponse>('info.min.json'),
    ]);
    editionsData = ed;
    infoData = inf;
    await Promise.all([
      saveMetaCache(EDITIONS_CACHE_KEY, editionsData),
      saveMetaCache(INFO_CACHE_KEY, infoData),
    ]);
  }

  const collections: HadithCollectionInfo[] = [];

  for (const target of TARGET_COLLECTIONS) {
    const rawCol = editionsData[target.slug];
    if (!rawCol || !Array.isArray(rawCol.collection)) {
      continue;
    }

    const findEdition = (langMatch: string) =>
      rawCol.collection?.find((e) => (e.language || '').toLowerCase() === langMatch)?.name || null;

    const arabicEdition = findEdition('arabic') || `ara-${target.slug}`;
    const englishEdition = findEdition('english') || `eng-${target.slug}`;
    const banglaEdition = findEdition('bengali');

    if (!arabicEdition && !englishEdition) continue;

    const rawSections = infoData[target.slug]?.metadata?.sections || {};
    const rawDetails = infoData[target.slug]?.metadata?.section_details || {};

    const sections: HadithSectionMeta[] = Object.entries(rawSections)
      .filter(([secNum, title]) => secNum !== '0' && Boolean(title?.trim()))
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([secNum, title]) => ({
        sectionNumber: secNum,
        title: title.trim(),
        hadithFirst: rawDetails[secNum]?.hadithnumber_first,
        hadithLast: rawDetails[secNum]?.hadithnumber_last,
      }));

    collections.push({
      slug: target.slug,
      nameEn: target.nameEn,
      nameAr: target.nameAr,
      nameBn: target.nameBn,
      arabicEdition,
      englishEdition,
      banglaEdition,
      sections,
    });
  }

  return collections;
}

export async function fetchHadithSection(
  collection: HadithCollectionInfo,
  sectionNumber: string
): Promise<{cache: HadithSectionCache; fromCache: boolean}> {
  const existing = await getCachedHadithSection(collection.slug, sectionNumber);
  if (existing && existing.entries.length > 0) {
    return {cache: existing, fromCache: true};
  }

  const sectionMeta = collection.sections.find((s) => s.sectionNumber === sectionNumber);

  const [araRes, engRes, benRes] = await Promise.allSettled([
    collection.arabicEdition
      ? fetchJsonWithMirrors<RawEditionFile>(
          `editions/${collection.arabicEdition}/sections/${sectionNumber}.min.json`
        )
      : Promise.reject(new Error('No Arabic edition')),
    collection.englishEdition
      ? fetchJsonWithMirrors<RawEditionFile>(
          `editions/${collection.englishEdition}/sections/${sectionNumber}.min.json`
        )
      : Promise.reject(new Error('No English edition')),
    collection.banglaEdition
      ? fetchJsonWithMirrors<RawEditionFile>(
          `editions/${collection.banglaEdition}/sections/${sectionNumber}.min.json`
        )
      : Promise.resolve(null),
  ]);

  const araData = araRes.status === 'fulfilled' ? araRes.value : null;
  const engData = engRes.status === 'fulfilled' ? engRes.value : null;
  const benData = benRes.status === 'fulfilled' ? benRes.value : null;

  if (!araData?.hadiths?.length && !engData?.hadiths?.length) {
    throw new Error('Could not load section hadiths from Hadith CDN.');
  }

  const mapByNumber = new Map<number, HadithEntry>();

  const ensureEntry = (item: RawHadithItem): HadithEntry => {
    const existingEntry = mapByNumber.get(item.hadithnumber);
    if (existingEntry) return existingEntry;
    const created: HadithEntry = {
      hadithNumber: item.hadithnumber,
      arabicNumber: item.arabicnumber,
      arabicText: '',
      englishText: '',
      banglaText: '',
      grades: Array.isArray(item.grades) ? item.grades : [],
      bookNumber: item.reference?.book,
      bookHadithNumber: item.reference?.hadith,
      sectionNumber,
      sectionTitle: sectionMeta?.title,
    };
    mapByNumber.set(item.hadithnumber, created);
    return created;
  };

  for (const h of araData?.hadiths || []) {
    const entry = ensureEntry(h);
    entry.arabicText = h.text || '';
    if (h.arabicnumber) entry.arabicNumber = h.arabicnumber;
    if (entry.grades.length === 0 && h.grades?.length) entry.grades = h.grades;
  }

  for (const h of engData?.hadiths || []) {
    const entry = ensureEntry(h);
    entry.englishText = h.text || '';
    if (entry.grades.length === 0 && h.grades?.length) entry.grades = h.grades;
    if (!entry.bookNumber && h.reference?.book) entry.bookNumber = h.reference.book;
    if (!entry.bookHadithNumber && h.reference?.hadith) entry.bookHadithNumber = h.reference.hadith;
  }

  let hasBangla = false;
  for (const h of benData?.hadiths || []) {
    const entry = ensureEntry(h);
    if (h.text?.trim()) {
      entry.banglaText = h.text;
      hasBangla = true;
    }
    if (entry.grades.length === 0 && h.grades?.length) entry.grades = h.grades;
  }

  const entries = Array.from(mapByNumber.values()).sort((a, b) => a.hadithNumber - b.hadithNumber);
  const cache: HadithSectionCache = {
    collectionSlug: collection.slug,
    sectionNumber,
    entries,
    hasBangla,
    fetchedAt: Date.now(),
  };

  await saveCachedHadithSection(cache);
  return {cache, fromCache: false};
}

export async function fetchSingleHadithByNumber(
  collection: HadithCollectionInfo,
  hadithNumber: number
): Promise<HadithEntry | null> {
  const num = Math.floor(hadithNumber);
  if (!Number.isFinite(num) || num <= 0) return null;

  const [araRes, engRes, benRes] = await Promise.allSettled([
    collection.arabicEdition
      ? fetchJsonWithMirrors<RawEditionFile>(`editions/${collection.arabicEdition}/${num}.min.json`)
      : Promise.reject(new Error('No Arabic')),
    collection.englishEdition
      ? fetchJsonWithMirrors<RawEditionFile>(`editions/${collection.englishEdition}/${num}.min.json`)
      : Promise.reject(new Error('No English')),
    collection.banglaEdition
      ? fetchJsonWithMirrors<RawEditionFile>(`editions/${collection.banglaEdition}/${num}.min.json`)
      : Promise.resolve(null),
  ]);

  const araH = araRes.status === 'fulfilled' ? araRes.value?.hadiths?.[0] : null;
  const engH = engRes.status === 'fulfilled' ? engRes.value?.hadiths?.[0] : null;
  const benH = benRes.status === 'fulfilled' ? benRes.value?.hadiths?.[0] : null;

  if (!araH && !engH && !benH) return null;

  const base = engH || araH || benH!;
  const matchedSection = collection.sections.find(
    (s) =>
      s.hadithFirst !== undefined &&
      s.hadithLast !== undefined &&
      num >= s.hadithFirst &&
      num <= s.hadithLast
  );

  return {
    hadithNumber: base.hadithnumber,
    arabicNumber: base.arabicnumber,
    arabicText: araH?.text || '',
    englishText: engH?.text || '',
    banglaText: benH?.text || '',
    grades: engH?.grades || araH?.grades || benH?.grades || [],
    bookNumber: base.reference?.book,
    bookHadithNumber: base.reference?.hadith,
    sectionNumber: matchedSection?.sectionNumber || String(base.reference?.book || '1'),
    sectionTitle: matchedSection?.title,
  };
}

// In-memory index of full collection text for keyword search so we don't store 5MB blobs repeatedly in LS
const memoryCollectionSearchCache = new Map<string, RawHadithItem[]>();

async function loadEditionHadithsForSearch(editionName: string): Promise<RawHadithItem[]> {
  const cached = memoryCollectionSearchCache.get(editionName);
  if (cached) return cached;
  const data = await fetchJsonWithMirrors<RawEditionFile>(`editions/${editionName}.min.json`);
  const list = Array.isArray(data?.hadiths) ? data.hadiths : [];
  memoryCollectionSearchCache.set(editionName, list);
  return list;
}

export async function searchHadithsInCollection(
  collection: HadithCollectionInfo,
  query: string,
  searchLang: AppLanguage,
  maxResults = 30
): Promise<HadithEntry[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Exact number lookup fast path
  if (/^\d+$/.test(trimmed)) {
    const single = await fetchSingleHadithByNumber(collection, Number(trimmed));
    return single ? [single] : [];
  }

  const normalized = trimmed.toLowerCase();
  const isArabicQuery = /[\u0600-\u06FF]/.test(trimmed);
  const isBanglaQuery = /[\u0980-\u09FF]/.test(trimmed);

  let primaryEdition = collection.englishEdition;
  if (isArabicQuery && collection.arabicEdition) {
    primaryEdition = collection.arabicEdition;
  } else if ((isBanglaQuery || searchLang === 'bn') && collection.banglaEdition) {
    primaryEdition = collection.banglaEdition;
  }

  if (!primaryEdition) return [];

  const [primaryList, araList, engList, benList] = await Promise.all([
    loadEditionHadithsForSearch(primaryEdition),
    collection.arabicEdition && collection.arabicEdition !== primaryEdition
      ? loadEditionHadithsForSearch(collection.arabicEdition).catch(() => [])
      : Promise.resolve([]),
    collection.englishEdition && collection.englishEdition !== primaryEdition
      ? loadEditionHadithsForSearch(collection.englishEdition).catch(() => [])
      : Promise.resolve([]),
    collection.banglaEdition && collection.banglaEdition !== primaryEdition
      ? loadEditionHadithsForSearch(collection.banglaEdition).catch(() => [])
      : Promise.resolve([]),
  ]);

  const araMap = new Map(araList.map((h) => [h.hadithnumber, h]));
  const engMap = new Map(engList.map((h) => [h.hadithnumber, h]));
  const benMap = new Map(benList.map((h) => [h.hadithnumber, h]));

  const matches: HadithEntry[] = [];
  for (const h of primaryList) {
    if (!h.text || !h.text.toLowerCase().includes(normalized)) continue;
    const ara = primaryEdition === collection.arabicEdition ? h : araMap.get(h.hadithnumber);
    const eng = primaryEdition === collection.englishEdition ? h : engMap.get(h.hadithnumber);
    const ben = primaryEdition === collection.banglaEdition ? h : benMap.get(h.hadithnumber);

    const matchedSection = collection.sections.find(
      (s) =>
        s.hadithFirst !== undefined &&
        s.hadithLast !== undefined &&
        h.hadithnumber >= s.hadithFirst &&
        h.hadithnumber <= s.hadithLast
    );

    matches.push({
      hadithNumber: h.hadithnumber,
      arabicNumber: h.arabicnumber,
      arabicText: ara?.text || '',
      englishText: eng?.text || '',
      banglaText: ben?.text || '',
      grades: h.grades || eng?.grades || [],
      bookNumber: h.reference?.book,
      bookHadithNumber: h.reference?.hadith,
      sectionNumber: matchedSection?.sectionNumber || String(h.reference?.book || '1'),
      sectionTitle: matchedSection?.title,
    });

    if (matches.length >= maxResults) break;
  }

  return matches;
}

const DAILY_HADITH_POOL: Array<{slug: HadithCollectionSlug; number: number}> = [
  {slug: 'bukhari', number: 1},
  {slug: 'bukhari', number: 13},
  {slug: 'bukhari', number: 6018},
  {slug: 'bukhari', number: 6116},
  {slug: 'bukhari', number: 6412},
  {slug: 'muslim', number: 55},
  {slug: 'muslim', number: 2564},
  {slug: 'muslim', number: 2699},
  {slug: 'tirmidhi', number: 1987},
  {slug: 'abudawud', number: 4941},
  {slug: 'nasai', number: 5003},
  {slug: 'ibnmajah', number: 4217},
  {slug: 'malik', number: 1621},
];

export interface HadithOfDayResult {
  collectionSlug: HadithCollectionSlug;
  collectionNameEn: string;
  collectionNameAr: string;
  collectionNameBn: string;
  entry: HadithEntry;
}

export async function fetchHadithOfTheDay(): Promise<HadithOfDayResult | null> {
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const cacheKey = `hadith_of_day_${dateKey}`;
  const cached = await getMetaCache<HadithOfDayResult>(cacheKey);
  if (cached?.entry) return cached;

  try {
    const dayNumber = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
    const pick = DAILY_HADITH_POOL[dayNumber % DAILY_HADITH_POOL.length];
    const targetMeta = TARGET_COLLECTIONS.find((c) => c.slug === pick.slug) || TARGET_COLLECTIONS[0];

    const catalog = await fetchHadithCatalog().catch(() => []);
    const collection = catalog.find((c) => c.slug === pick.slug) || {
      slug: pick.slug,
      nameEn: targetMeta.nameEn,
      nameAr: targetMeta.nameAr,
      nameBn: targetMeta.nameBn,
      arabicEdition: `ara-${pick.slug}`,
      englishEdition: `eng-${pick.slug}`,
      banglaEdition: `ben-${pick.slug}`,
      sections: [],
    };

    const entry = await fetchSingleHadithByNumber(collection, pick.number);
    if (!entry) return null;

    const result: HadithOfDayResult = {
      collectionSlug: collection.slug,
      collectionNameEn: collection.nameEn,
      collectionNameAr: collection.nameAr,
      collectionNameBn: collection.nameBn,
      entry,
    };
    await saveMetaCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}
