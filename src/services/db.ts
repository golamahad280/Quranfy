import {Capacitor} from '@capacitor/core';
import {Directory, Filesystem} from '@capacitor/filesystem';
import {
  DownloadRecord,
  HadithSectionCache,
  SurahDetail,
  TafsirAyahContent,
} from '../types/quran';

const DB_NAME = 'quranfy-offline-db';
const DB_VERSION = 2;
const STORE_SURAHS = 'surahs';
const STORE_BANGLA_QURAN = 'bangla_quran';
const STORE_TAFSIRS = 'tafsirs';
const STORE_HADITH_SECTIONS = 'hadith_sections';
const STORE_DOWNLOADS = 'downloads';
const STORE_META = 'meta';
export const NATIVE_AUDIO_DIR = 'quranfy-audio';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SURAHS)) {
        db.createObjectStore(STORE_SURAHS, {keyPath: 'cacheKey'});
      }
      if (!db.objectStoreNames.contains(STORE_BANGLA_QURAN)) {
        db.createObjectStore(STORE_BANGLA_QURAN, {keyPath: 'surahNumber'});
      }
      if (!db.objectStoreNames.contains(STORE_TAFSIRS)) {
        db.createObjectStore(STORE_TAFSIRS, {keyPath: 'cacheKey'});
      }
      if (!db.objectStoreNames.contains(STORE_HADITH_SECTIONS)) {
        db.createObjectStore(STORE_HADITH_SECTIONS, {keyPath: 'cacheKey'});
      }
      if (!db.objectStoreNames.contains(STORE_DOWNLOADS)) {
        db.createObjectStore(STORE_DOWNLOADS, {keyPath: 'key'});
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, {keyPath: 'key'});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function getCachedSurah(
  surahNumber: number,
  translationEdition: string
): Promise<SurahDetail | null> {
  try {
    const db = await openDb();
    const key = `${surahNumber}_${translationEdition}`;
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_SURAHS, 'readonly');
      const req = tx.objectStore(STORE_SURAHS).get(key);
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCachedSurah(detail: SurahDetail): Promise<void> {
  try {
    const db = await openDb();
    const cacheKey = `${detail.surahNumber}_${detail.translationEdition}`;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_SURAHS, 'readwrite');
      tx.objectStore(STORE_SURAHS).put({cacheKey, data: detail});
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore storage quota issues gracefully
  }
}

export async function getCachedBanglaSurah(
  surahNumber: number
): Promise<Record<number, string> | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_BANGLA_QURAN, 'readonly');
      const req = tx.objectStore(STORE_BANGLA_QURAN).get(surahNumber);
      req.onsuccess = () => resolve(req.result?.verses ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCachedBanglaSurah(
  surahNumber: number,
  verses: Record<number, string>
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_BANGLA_QURAN, 'readwrite');
      tx.objectStore(STORE_BANGLA_QURAN).put({surahNumber, verses, fetchedAt: Date.now()});
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore quota issues
  }
}

export async function getCachedTafsir(
  tafsirId: number,
  verseKey: string
): Promise<TafsirAyahContent | null> {
  try {
    const db = await openDb();
    const cacheKey = `${tafsirId}_${verseKey}`;
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_TAFSIRS, 'readonly');
      const req = tx.objectStore(STORE_TAFSIRS).get(cacheKey);
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCachedTafsir(entry: TafsirAyahContent): Promise<void> {
  try {
    const db = await openDb();
    const cacheKey = `${entry.tafsirId}_${entry.verseKey}`;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_TAFSIRS, 'readwrite');
      tx.objectStore(STORE_TAFSIRS).put({cacheKey, data: entry});
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore quota issues
  }
}

export async function getCachedHadithSection(
  collectionSlug: string,
  sectionNumber: string
): Promise<HadithSectionCache | null> {
  try {
    const db = await openDb();
    const cacheKey = `${collectionSlug}_${sectionNumber}`;
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_HADITH_SECTIONS, 'readonly');
      const req = tx.objectStore(STORE_HADITH_SECTIONS).get(cacheKey);
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCachedHadithSection(data: HadithSectionCache): Promise<void> {
  try {
    const db = await openDb();
    const cacheKey = `${data.collectionSlug}_${data.sectionNumber}`;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_HADITH_SECTIONS, 'readwrite');
      tx.objectStore(STORE_HADITH_SECTIONS).put({cacheKey, data});
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore quota issues
  }
}

export async function listCachedHadithSectionKeys(): Promise<string[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_HADITH_SECTIONS, 'readonly');
      const req = tx.objectStore(STORE_HADITH_SECTIONS).getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveMetaCache<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      tx.objectStore(STORE_META).put({key, value, updatedAt: Date.now()});
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

export async function getMetaCache<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const req = tx.objectStore(STORE_META).get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveAudioDownload(record: DownloadRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readwrite');
    tx.objectStore(STORE_DOWNLOADS).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioDownload(
  reciterId: string,
  surahNumber: number
): Promise<DownloadRecord | null> {
  try {
    const db = await openDb();
    const key = `${reciterId}_${surahNumber}`;
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_DOWNLOADS, 'readonly');
      const req = tx.objectStore(STORE_DOWNLOADS).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function listAudioDownloads(): Promise<Omit<DownloadRecord, 'blob'>[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_DOWNLOADS, 'readonly');
      const req = tx.objectStore(STORE_DOWNLOADS).getAll();
      req.onsuccess = () => {
        const rows = (req.result as DownloadRecord[]) || [];
        resolve(
          rows.map(({blob: _blob, ...rest}) => rest).sort((a, b) => b.downloadedAt - a.downloadedAt)
        );
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteAudioDownload(key: string): Promise<void> {
  const db = await openDb();
  const existing = await new Promise<DownloadRecord | null>((resolve) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readonly');
    const req = tx.objectStore(STORE_DOWNLOADS).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });

  if (existing?.nativeFilePath && Capacitor.isNativePlatform()) {
    try {
      await Filesystem.deleteFile({
        path: existing.nativeFilePath,
        directory: Directory.Data,
      });
    } catch {
      // Ignore if file already removed
    }
  }

  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readwrite');
    tx.objectStore(STORE_DOWNLOADS).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function clearAllOfflineCaches(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.rmdir({
        path: NATIVE_AUDIO_DIR,
        directory: Directory.Data,
        recursive: true,
      });
    } catch {
      // Directory may not exist yet
    }
  }

  try {
    const db = await openDb();
    const stores = [
      STORE_SURAHS,
      STORE_BANGLA_QURAN,
      STORE_TAFSIRS,
      STORE_HADITH_SECTIONS,
      STORE_DOWNLOADS,
      STORE_META,
    ];
    await Promise.all(
      stores.map(
        (storeName) =>
          new Promise<void>((resolve) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          })
      )
    );
  } catch {
    // Ignore
  }
}
