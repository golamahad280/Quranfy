import {DownloadRecord, SurahDetail} from '../types/quran';

const DB_NAME = 'quranfy-offline-db';
const DB_VERSION = 1;
const STORE_SURAHS = 'surahs';
const STORE_DOWNLOADS = 'downloads';
const STORE_META = 'meta';

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

export async function getAudioDownload(reciterId: string, surahNumber: number): Promise<DownloadRecord | null> {
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
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readwrite');
    tx.objectStore(STORE_DOWNLOADS).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function clearAllOfflineCaches(): Promise<void> {
  try {
    const db = await openDb();
    await Promise.all([
      new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_SURAHS, 'readwrite');
        tx.objectStore(STORE_SURAHS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      }),
      new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_DOWNLOADS, 'readwrite');
        tx.objectStore(STORE_DOWNLOADS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      }),
      new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_META, 'readwrite');
        tx.objectStore(STORE_META).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      }),
    ]);
  } catch {
    // Ignore
  }
}
