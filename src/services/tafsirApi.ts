import DOMPurify from 'dompurify';
import {AppLanguage, TafsirAyahContent, TafsirResource} from '../types/quran';
import {getCachedTafsir, getMetaCache, saveCachedTafsir, saveMetaCache} from './db';

const QURAN_COM_V4_BASE = 'https://api.quran.com/api/v4';
const TAFSIR_LIST_CACHE_KEY = 'quran_com_tafsir_resources_v1';

export interface GroupedTafsirs {
  english: TafsirResource[];
  bangla: TafsirResource[];
  others: TafsirResource[];
}

export async function fetchAvailableTafsirs(forceRefresh = false): Promise<TafsirResource[]> {
  if (!forceRefresh) {
    const cached = await getMetaCache<TafsirResource[]>(TAFSIR_LIST_CACHE_KEY);
    if (cached && cached.length > 0) {
      if (navigator.onLine) {
        void refreshTafsirResourcesInBackground();
      }
      return cached;
    }
  }

  const res = await fetch(`${QURAN_COM_V4_BASE}/resources/tafsirs`);
  if (!res.ok) {
    throw new Error(`Quran.com tafsirs API returned status ${res.status}`);
  }
  const json = (await res.json()) as {tafsirs?: TafsirResource[]};
  const list = Array.isArray(json?.tafsirs) ? json.tafsirs : [];
  if (list.length > 0) {
    await saveMetaCache(TAFSIR_LIST_CACHE_KEY, list);
  }
  return list;
}

async function refreshTafsirResourcesInBackground(): Promise<void> {
  try {
    const res = await fetch(`${QURAN_COM_V4_BASE}/resources/tafsirs`);
    if (!res.ok) return;
    const json = (await res.json()) as {tafsirs?: TafsirResource[]};
    if (Array.isArray(json?.tafsirs) && json.tafsirs.length > 0) {
      await saveMetaCache(TAFSIR_LIST_CACHE_KEY, json.tafsirs);
    }
  } catch {
    // Silent background refresh
  }
}

export function groupTafsirsByLanguage(tafsirs: TafsirResource[]): GroupedTafsirs {
  const english: TafsirResource[] = [];
  const bangla: TafsirResource[] = [];
  const others: TafsirResource[] = [];

  for (const t of tafsirs) {
    const lang = (t.language_name || '').toLowerCase();
    if (lang === 'english' || lang === 'en') {
      english.push(t);
    } else if (lang === 'bengali' || lang === 'bangla' || lang === 'bn') {
      bangla.push(t);
    } else {
      others.push(t);
    }
  }

  return {english, bangla, others};
}

export function resolvePreferredTafsirId(
  tafsirs: TafsirResource[],
  selectedId: number | null,
  appLanguage: AppLanguage
): number | null {
  if (selectedId !== null && tafsirs.some((t) => t.id === selectedId)) {
    return selectedId;
  }
  const grouped = groupTafsirsByLanguage(tafsirs);
  if (appLanguage === 'bn' && grouped.bangla.length > 0) {
    return grouped.bangla[0].id;
  }
  if (grouped.english.length > 0) {
    return grouped.english[0].id;
  }
  if (grouped.bangla.length > 0) {
    return grouped.bangla[0].id;
  }
  return tafsirs[0]?.id ?? null;
}

export function sanitizeTafsirHtml(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: {html: true},
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style', 'form', 'input'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  });
}

export async function fetchAyahTafsir(
  tafsirId: number,
  surahNumber: number,
  ayahNumber: number,
  fallbackResource?: TafsirResource
): Promise<{content: TafsirAyahContent; fromCache: boolean}> {
  const verseKey = `${surahNumber}:${ayahNumber}`;
  const cached = await getCachedTafsir(tafsirId, verseKey);
  if (cached) {
    return {content: cached, fromCache: true};
  }

  const res = await fetch(
    `${QURAN_COM_V4_BASE}/tafsirs/${encodeURIComponent(String(tafsirId))}/by_ayah/${encodeURIComponent(
      verseKey
    )}`
  );
  if (!res.ok) {
    throw new Error(`Tafsir endpoint returned status ${res.status}`);
  }

  const json = (await res.json()) as {
    tafsir?: {
      resource_id?: number;
      resource_name?: string;
      language_id?: number;
      text?: string;
    };
  };

  const rawText = json?.tafsir?.text || '';
  const sanitizedHtml = sanitizeTafsirHtml(rawText);

  const entry: TafsirAyahContent = {
    tafsirId,
    verseKey,
    resourceName: json?.tafsir?.resource_name || fallbackResource?.name || 'Tafsir',
    languageName: fallbackResource?.language_name || '',
    sanitizedHtml,
    fetchedAt: Date.now(),
  };

  if (sanitizedHtml.trim().length > 0) {
    await saveCachedTafsir(entry);
  }

  return {content: entry, fromCache: false};
}
