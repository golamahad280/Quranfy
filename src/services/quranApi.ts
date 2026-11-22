import {FEATURED_RECITERS} from '../data/recitersAndPlaylists';
import {SURAHS} from '../data/surahs';
import {AyahItem, DownloadRecord, Reciter, SurahDetail, SurahMeta} from '../types/quran';
import {
  getCachedSurah,
  getMetaCache,
  saveAudioDownload,
  saveCachedSurah,
  saveMetaCache,
} from './db';

const ALQURAN_BASE = 'https://api.alquran.cloud/v1';
const MP3QURAN_BASE = 'https://mp3quran.net/api/v3';

export function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

export async function fetchSurahList(): Promise<SurahMeta[]> {
  const cached = await getMetaCache<SurahMeta[]>('surah_list');
  if (cached && cached.length === 114) {
    // Refresh silently in background if online
    if (navigator.onLine) {
      fetch(`${ALQURAN_BASE}/surah`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.data?.length === 114) {
            saveMetaCache('surah_list', j.data);
          }
        })
        .catch(() => {});
    }
    return cached;
  }

  try {
    const res = await fetch(`${ALQURAN_BASE}/surah`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data.length === 114) {
        await saveMetaCache('surah_list', json.data);
        return json.data;
      }
    }
  } catch {
    // Fallback to embedded 114 surah table
  }
  return SURAHS;
}

export async function fetchSurahWithTranslation(
  surahNumber: number,
  translationEdition: string
): Promise<SurahDetail> {
  const cached = await getCachedSurah(surahNumber, translationEdition);
  if (cached) {
    return cached;
  }

  const url = `${ALQURAN_BASE}/surah/${surahNumber}/editions/quran-uthmani,${encodeURIComponent(
    translationEdition
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load Surah ${surahNumber}`);
  }
  const json = await res.json();
  const editions = json?.data;
  if (!Array.isArray(editions) || editions.length < 2) {
    throw new Error('Unexpected response format from alquran.cloud');
  }

  const arabicAyahs = editions[0].ayahs as Array<{
    number: number;
    numberInSurah: number;
    text: string;
    juz: number;
    page: number;
  }>;
  const transAyahs = editions[1].ayahs as Array<{
    text: string;
  }>;

  const ayahs: AyahItem[] = arabicAyahs.map((a, idx) => ({
    number: a.number,
    numberInSurah: a.numberInSurah,
    text: a.text,
    translation: transAyahs[idx]?.text ?? '',
    juz: a.juz,
    page: a.page,
  }));

  const detail: SurahDetail = {
    surahNumber,
    translationEdition,
    ayahs,
    fetchedAt: Date.now(),
  };
  await saveCachedSurah(detail);
  return detail;
}

interface Mp3QuranReciterRaw {
  id: number;
  name: string;
  moshaf: Array<{
    id: number;
    name: string;
    server: string;
    surah_total: number;
    surah_list: string;
  }>;
}

export async function fetchLiveReciters(): Promise<Reciter[]> {
  const cached = await getMetaCache<Reciter[]>('live_reciters');
  if (cached && cached.length >= FEATURED_RECITERS.length) {
    return cached;
  }

  try {
    const [enRes, arRes] = await Promise.all([
      fetch(`${MP3QURAN_BASE}/reciters?language=eng`),
      fetch(`${MP3QURAN_BASE}/reciters?language=ar`),
    ]);

    if (!enRes.ok || !arRes.ok) {
      return FEATURED_RECITERS;
    }

    const enData = (await enRes.json()) as {reciters: Mp3QuranReciterRaw[]};
    const arData = (await arRes.json()) as {reciters: Mp3QuranReciterRaw[]};
    const arMap = new Map(arData.reciters.map((r) => [r.id, r.name]));

    // Keep our 11 curated featured reciters first, enriched if needed, then add extra verified 114-surah reciters
    const featuredIds = new Set(FEATURED_RECITERS.map((r) => r.serverUrl));
    const extras: Reciter[] = [];

    for (const r of enData.reciters) {
      const moshaf = r.moshaf?.find((m) => m.surah_total === 114) || r.moshaf?.[0];
      if (!moshaf?.server) continue;
      if (featuredIds.has(moshaf.server)) continue;
      const arName = arMap.get(r.id) || r.name;
      // Avoid duplicates with featured reciters by checking common keywords
      const low = r.name.toLowerCase();
      if (
        low.includes('sudae') ||
        low.includes('afasi') ||
        low.includes('meaqli') ||
        low.includes('lohaidan') ||
        low.includes('balushi') ||
        low.includes('alturki') ||
        low.includes('ali jaber') ||
        low.includes('yasser al-dosari') ||
        arName.includes('منصور السالمي')
      ) {
        continue;
      }
      if (moshaf.surah_total === 114 && extras.length < 30) {
        extras.push({
          id: `mp3quran-${r.id}`,
          nameEn: r.name,
          nameAr: arName,
          serverUrl: moshaf.server.endsWith('/') ? moshaf.server : `${moshaf.server}/`,
          everyAyahFolder: 'Alafasy_128kbps',
          everyAyahLowFolder: 'Alafasy_64kbps',
          styleEn: moshaf.name || 'Full Murattal · 114 Surahs',
          styleAr: moshaf.name || 'مصحف مرتل كامل',
          recommendedModes: ['study', 'work'],
          isCommunityExtra: true,
        });
      }
    }

    const combined = [...FEATURED_RECITERS, ...extras];
    await saveMetaCache('live_reciters', combined);
    return combined;
  } catch {
    return FEATURED_RECITERS;
  }
}

export function getSurahAudioUrl(reciter: Reciter, surahNumber: number): string {
  if (reciter.archiveSurahMap && reciter.archiveSurahMap[surahNumber]) {
    return reciter.archiveSurahMap[surahNumber];
  }
  if (reciter.availableSurahs && !reciter.availableSurahs.includes(surahNumber)) {
    const base = reciter.fallbackServerUrl || 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/';
    return `${base}${pad3(surahNumber)}.mp3`;
  }
  return `${reciter.serverUrl}${pad3(surahNumber)}.mp3`;
}

export function getAyahAudioUrl(
  reciter: Reciter,
  surahNumber: number,
  ayahNumberInSurah: number,
  quality: 'high' | 'standard'
): string {
  const folder =
    quality === 'standard' && reciter.everyAyahLowFolder
      ? reciter.everyAyahLowFolder
      : reciter.everyAyahFolder;
  return `https://everyayah.com/data/${folder}/${pad3(surahNumber)}${pad3(ayahNumberInSurah)}.mp3`;
}

export interface AyahSearchMatch {
  surahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  numberInSurah: number;
  text: string;
}

export async function searchQuranAyahs(
  query: string,
  edition = 'en.sahih'
): Promise<AyahSearchMatch[]> {
  const clean = query.trim();
  if (clean.length < 3) return [];

  const isArabic = /[\u0600-\u06FF]/.test(clean);
  const searchEdition = isArabic ? 'quran-simple-clean' : edition;
  try {
    const res = await fetch(
      `${ALQURAN_BASE}/search/${encodeURIComponent(clean)}/all/${encodeURIComponent(searchEdition)}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    const matches = json?.data?.matches;
    if (!Array.isArray(matches)) return [];
    return matches.slice(0, 20).map(
      (m: {
        surah: {number: number; englishName: string; name: string};
        numberInSurah: number;
        text: string;
      }) => ({
        surahNumber: m.surah.number,
        surahNameEn: m.surah.englishName,
        surahNameAr: m.surah.name,
        numberInSurah: m.numberInSurah,
        text: m.text,
      })
    );
  } catch {
    return [];
  }
}

export async function downloadSurahForOffline(
  reciter: Reciter,
  surah: SurahMeta,
  onProgress?: (pct: number) => void
): Promise<DownloadRecord> {
  const url = getSurahAudioUrl(reciter, surah.number);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Unable to download surah audio');
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  let blob: Blob;

  if (response.body && contentLength > 0) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        onProgress?.(Math.min(99, Math.round((received / contentLength) * 100)));
      }
    }
    const merged = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    blob = new Blob([merged], {type: 'audio/mpeg'});
  } else {
    blob = await response.blob();
  }

  onProgress?.(100);

  const record: DownloadRecord = {
    key: `${reciter.id}_${surah.number}`,
    reciterId: reciter.id,
    reciterNameEn: reciter.nameEn,
    reciterNameAr: reciter.nameAr,
    surahNumber: surah.number,
    surahNameEn: surah.englishName,
    surahNameAr: surah.name,
    sizeBytes: blob.size,
    downloadedAt: Date.now(),
    blob,
  };

  await saveAudioDownload(record);
  return record;
}
