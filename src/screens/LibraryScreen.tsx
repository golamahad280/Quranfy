import {
  ArrowDown,
  ArrowUp,
  Download,
  Heart,
  ListMusic,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import React, {useEffect, useMemo, useState} from 'react';
import {TRANSLATIONS} from '../data/i18n';
import {CURATED_PLAYLISTS} from '../data/recitersAndPlaylists';
import {audioManager} from '../services/audioManager';
import {deleteAudioDownload, listAudioDownloads} from '../services/db';
import {downloadSurahForOffline} from '../services/quranApi';
import {useQuranStore} from '../store/useQuranStore';
import {DownloadRecord} from '../types/quran';
import {formatBytes} from '../utils/formatters';

type LibraryTab = 'playlists' | 'favorites' | 'downloads';

export const LibraryScreen: React.FC = () => {
  const [subTab, setSubTab] = useState<LibraryTab>('playlists');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(null);
  const [selectedSurahToAdd, setSelectedSurahToAdd] = useState(1);
  const [selectedReciterToAdd, setSelectedReciterToAdd] = useState('mishary-alafasy');

  const [dlSurahNum, setDlSurahNum] = useState(1);
  const [dlReciterId, setDlReciterId] = useState('mishary-alafasy');
  const [downloads, setDownloads] = useState<Omit<DownloadRecord, 'blob'>[]>([]);

  const surahs = useQuranStore((s) => s.surahs);
  const reciters = useQuranStore((s) => s.reciters);
  const customPlaylists = useQuranStore((s) => s.customPlaylists);
  const favoriteSurahNumbers = useQuranStore((s) => s.favoriteSurahNumbers);
  const favoriteAyahs = useQuranStore((s) => s.favoriteAyahs);
  const favoriteReciterIds = useQuranStore((s) => s.favoriteReciterIds);
  const downloadProgress = useQuranStore((s) => s.downloadProgress);
  const lang = useQuranStore((s) => s.settings.language);

  const createPlaylist = useQuranStore((s) => s.createPlaylist);
  const renamePlaylist = useQuranStore((s) => s.renamePlaylist);
  const deletePlaylist = useQuranStore((s) => s.deletePlaylist);
  const addToPlaylist = useQuranStore((s) => s.addToPlaylist);
  const removeFromPlaylist = useQuranStore((s) => s.removeFromPlaylist);
  const movePlaylistItem = useQuranStore((s) => s.movePlaylistItem);
  const updatePlaylistItemReciter = useQuranStore((s) => s.updatePlaylistItemReciter);
  const setQueueAndPlay = useQuranStore((s) => s.setQueueAndPlay);
  const toggleFavoriteSurah = useQuranStore((s) => s.toggleFavoriteSurah);
  const toggleFavoriteAyah = useQuranStore((s) => s.toggleFavoriteAyah);
  const toggleFavoriteReciter = useQuranStore((s) => s.toggleFavoriteReciter);
  const openReader = useQuranStore((s) => s.openReader);
  const setDownloadProgress = useQuranStore((s) => s.setDownloadProgress);
  const setDownloadedKeys = useQuranStore((s) => s.setDownloadedKeys);
  const showToast = useQuranStore((s) => s.showToast);

  const t = TRANSLATIONS[lang];

  const refreshDownloads = async () => {
    const list = await listAudioDownloads();
    setDownloads(list);
    setDownloadedKeys(list.map((d) => d.key));
  };

  useEffect(() => {
    refreshDownloads();
  }, [subTab]);

  const totalBytes = useMemo(
    () => downloads.reduce((acc, d) => acc + (d.sizeBytes || 0), 0),
    [downloads]
  );

  const handleStartDownload = async () => {
    const reciter = reciters.find((r) => r.id === dlReciterId) || reciters[0];
    const surah = surahs.find((s) => s.number === dlSurahNum) || surahs[0];
    const key = `${reciter.id}_${surah.number}`;
    if (downloadProgress[key] !== undefined) return;
    try {
      setDownloadProgress(key, 1);
      await downloadSurahForOffline(reciter, surah, (pct) => setDownloadProgress(key, pct));
      setDownloadProgress(key, null);
      await refreshDownloads();
      showToast(lang === 'ar' ? 'تم الحفظ للاستماع دون إنترنت' : 'Downloaded for offline play');
    } catch {
      setDownloadProgress(key, null);
      showToast(lang === 'ar' ? 'فشل التحميل' : 'Download failed');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Sub-navigation Segmented Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#E5ECE8] dark:bg-[#16241F]">
        {(
          [
            {id: 'playlists', label: t.library.playlists},
            {id: 'favorites', label: t.library.favorites},
            {id: 'downloads', label: t.library.downloads},
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              subTab === tab.id
                ? 'bg-white dark:bg-[#233730] text-[#13201C] dark:text-[#ECF2EF] shadow-sm'
                : 'text-[#546660] dark:text-[#96ABA3]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PLAYLISTS TAB */}
      {subTab === 'playlists' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#13201C] dark:text-[#ECF2EF]">
              {t.library.playlists}
            </h2>
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="md-ripple inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>{t.library.createPlaylist}</span>
            </button>
          </div>

          {showCreateForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPlaylistName.trim()) return;
                createPlaylist(newPlaylistName);
                setNewPlaylistName('');
                setShowCreateForm(false);
              }}
              className="rounded-2xl bg-white dark:bg-[#131F1C] border border-black/10 dark:border-white/10 p-4 flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder={t.library.playlistName}
                className="flex-1 min-h-[44px] rounded-xl bg-[#F3F6F4] dark:bg-[#192823] px-3.5 text-sm outline-none focus:ring-2 focus:ring-[#0F5C4D]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="md-ripple px-5 min-h-[44px] rounded-xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-xs font-semibold"
                >
                  {t.library.create}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 min-h-[44px] rounded-xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-xs font-medium"
                >
                  {t.library.cancel}
                </button>
              </div>
            </form>
          )}

          {/* Custom Playlists */}
          {customPlaylists.length > 0 && (
            <div className="space-y-4">
              {customPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-4 sm:p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {editingId === pl.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          renamePlaylist(pl.id, editingName);
                          setEditingId(null);
                        }}
                        className="flex items-center gap-2 flex-1"
                      >
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 min-h-[40px] rounded-xl bg-[#F3F6F4] dark:bg-[#192823] px-3 text-sm"
                        />
                        <button
                          type="submit"
                          className="px-3 min-h-[40px] rounded-xl bg-[#0F5C4D] text-white text-xs font-semibold"
                        >
                          OK
                        </button>
                      </form>
                    ) : (
                      <div>
                        <h3 className="text-base font-bold">{pl.nameEn}</h3>
                        <p className="text-xs text-[#546660] dark:text-[#96ABA3] tabular-nums">
                          {pl.items.length} {lang === 'ar' ? 'سور' : 'surahs'}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {pl.items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setQueueAndPlay(
                              pl.items.map((it) => ({
                                surahNumber: it.surahNumber,
                                reciterId: it.reciterId,
                              })),
                              0
                            );
                            audioManager.loadAndPlayCurrent(0);
                          }}
                          aria-label="Play Playlist"
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setAddingToPlaylistId(addingToPlaylistId === pl.id ? null : pl.id)
                        }
                        aria-label={t.library.addSurah}
                        className="min-h-[40px] px-3 rounded-xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.library.addSurah}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(pl.id);
                          setEditingName(pl.nameEn);
                        }}
                        aria-label={t.library.rename}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePlaylist(pl.id)}
                        aria-label={t.library.delete}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {addingToPlaylistId === pl.id && (
                    <div className="rounded-2xl bg-[#F3F6F4] dark:bg-[#192823] p-3 flex flex-wrap items-center gap-2">
                      <select
                        value={selectedSurahToAdd}
                        onChange={(e) => setSelectedSurahToAdd(Number(e.target.value))}
                        className="flex-1 min-w-[160px] min-h-[40px] rounded-xl bg-white dark:bg-[#131F1C] px-3 text-xs"
                      >
                        {surahs.map((s) => (
                          <option key={s.number} value={s.number}>
                            {s.number}. {s.englishName} ({s.name})
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedReciterToAdd}
                        onChange={(e) => setSelectedReciterToAdd(e.target.value)}
                        className="flex-1 min-w-[160px] min-h-[40px] rounded-xl bg-white dark:bg-[#131F1C] px-3 text-xs"
                      >
                        {reciters.map((r) => (
                          <option key={r.id} value={r.id}>
                            {lang === 'ar' ? r.nameAr : r.nameEn}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          addToPlaylist(pl.id, selectedSurahToAdd, selectedReciterToAdd);
                          setAddingToPlaylistId(null);
                        }}
                        className="min-h-[40px] px-4 rounded-xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-xs font-semibold"
                      >
                        {lang === 'ar' ? 'إضافة' : 'Add'}
                      </button>
                    </div>
                  )}

                  {pl.items.length > 0 && (
                    <div className="space-y-2">
                      {pl.items.map((item, idx) => {
                        const s = surahs.find((x) => x.number === item.surahNumber);
                        if (!s) return null;
                        return (
                          <div
                            key={item.id}
                            className="rounded-xl bg-[#F6F8F7] dark:bg-[#192823] px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setQueueAndPlay(
                                  pl.items.map((it) => ({
                                    surahNumber: it.surahNumber,
                                    reciterId: it.reciterId,
                                  })),
                                  idx
                                );
                                audioManager.loadAndPlayCurrent(0);
                              }}
                              className="text-start min-w-0 flex-1"
                            >
                              <p className="text-xs font-semibold truncate">
                                {s.number}. {s.englishName} · {s.name}
                              </p>
                            </button>

                            <div className="flex items-center gap-1">
                              <select
                                value={item.reciterId}
                                onChange={(e) =>
                                  updatePlaylistItemReciter(pl.id, item.id, e.target.value)
                                }
                                aria-label="Reciter"
                                className="min-h-[34px] max-w-[140px] rounded-lg bg-white dark:bg-[#131F1C] px-2 text-[11px]"
                              >
                                {reciters.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {lang === 'ar' ? r.nameAr : r.nameEn}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => movePlaylistItem(pl.id, item.id, 'up')}
                                aria-label="Move up"
                                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === pl.items.length - 1}
                                onClick={() => movePlaylistItem(pl.id, item.id, 'down')}
                                aria-label="Move down"
                                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFromPlaylist(pl.id, item.id)}
                                aria-label="Remove"
                                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-rose-500"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Curated Playlists */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#546660] dark:text-[#96ABA3]">
              {lang === 'ar' ? 'القوائم المختارة' : 'Curated Collections'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CURATED_PLAYLISTS.map((pl) => (
                <div
                  key={pl.id}
                  className="rounded-2xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#0F5C4D] dark:text-[#4ECBA9] flex items-center justify-center shrink-0">
                      <ListMusic className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {lang === 'ar' ? pl.nameAr : pl.nameEn}
                      </p>
                      <p className="text-xs text-[#546660] dark:text-[#96ABA3] truncate">
                        {pl.mode ? t.modes[pl.mode] : ''} · {pl.items.length}{' '}
                        {lang === 'ar' ? 'سور' : 'surahs'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQueueAndPlay(
                        pl.items.map((it) => ({
                          surahNumber: it.surahNumber,
                          reciterId: it.reciterId,
                        })),
                        0
                      );
                      audioManager.loadAndPlayCurrent(0);
                    }}
                    aria-label={`Play ${pl.nameEn}`}
                    className="md-ripple min-h-[44px] min-w-[44px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] flex items-center justify-center shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current ms-0.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAVORITES TAB */}
      {subTab === 'favorites' && (
        <div className="space-y-6">
          {favoriteSurahNumbers.length === 0 &&
          favoriteAyahs.length === 0 &&
          favoriteReciterIds.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-8 text-center">
              <p className="text-sm text-[#546660] dark:text-[#96ABA3]">
                {t.library.emptyFavorites}
              </p>
            </div>
          ) : (
            <>
              {favoriteSurahNumbers.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-[#0F5C4D] dark:text-[#4ECBA9] mb-2.5">
                    {t.library.favSurahs}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {favoriteSurahNumbers.map((num) => {
                      const s = surahs.find((x) => x.number === num);
                      if (!s) return null;
                      return (
                        <div
                          key={s.number}
                          className="rounded-2xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-3.5 flex items-center justify-between gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => openReader(s.number)}
                            className="text-start flex-1 min-w-0 min-h-[44px]"
                          >
                            <p className="text-sm font-semibold truncate">
                              {s.number}. {s.englishName} · {s.name}
                            </p>
                            <p className="text-xs text-[#546660] dark:text-[#96ABA3]">
                              {s.numberOfAyahs} {t.home.ayahs}
                            </p>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleFavoriteSurah(s.number)}
                              aria-label="Remove favorite"
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl"
                            >
                              <Heart className="w-4 h-4 fill-[#C69749] text-[#C69749]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => audioManager.playSurah(s.number)}
                              aria-label="Play"
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#0F5C4D] dark:text-[#4ECBA9]"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {favoriteReciterIds.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-[#0F5C4D] dark:text-[#4ECBA9] mb-2.5">
                    {t.library.favReciters}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {favoriteReciterIds.map((id) => {
                      const r = reciters.find((x) => x.id === id);
                      if (!r) return null;
                      return (
                        <div
                          key={r.id}
                          className="rounded-2xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-3.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {lang === 'ar' ? r.nameAr : r.nameEn}
                            </p>
                            <p className="text-xs text-[#546660] dark:text-[#96ABA3] truncate">
                              {lang === 'ar' ? r.styleAr : r.styleEn}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleFavoriteReciter(r.id)}
                              aria-label="Remove favorite reciter"
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center"
                            >
                              <Heart className="w-4 h-4 fill-[#C69749] text-[#C69749]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => audioManager.playSurah(1, r.id)}
                              aria-label="Play reciter"
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#0F5C4D] dark:text-[#4ECBA9]"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {favoriteAyahs.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-[#0F5C4D] dark:text-[#4ECBA9] mb-2.5">
                    {t.library.favAyahs}
                  </h2>
                  <div className="space-y-2.5">
                    {favoriteAyahs.map((ayah) => (
                      <div
                        key={ayah.id}
                        className="rounded-2xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#0F5C4D] dark:text-[#4ECBA9]">
                            {ayah.surahNameEn} · {ayah.id}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleFavoriteAyah(ayah)}
                              aria-label="Remove favorite ayah"
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center"
                            >
                              <Heart className="w-4 h-4 fill-[#C69749] text-[#C69749]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => audioManager.playAyah(ayah.surahNumber, ayah.ayahNumber)}
                              aria-label="Play ayah"
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#0F5C4D] dark:text-[#4ECBA9]"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          </div>
                        </div>
                        <p className="font-quran-amiri text-xl text-right leading-loose" dir="rtl">
                          {ayah.arabicText}
                        </p>
                        {ayah.translationText && (
                          <p className="mt-2 text-xs text-[#546660] dark:text-[#96ABA3]">
                            {ayah.translationText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* OFFLINE DOWNLOADS TAB */}
      {subTab === 'downloads' && (
        <div className="space-y-5">
          {/* Storage Used Card */}
          <div className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#546660] dark:text-[#96ABA3]">{t.library.storageUsed}</p>
              <p className="text-2xl font-bold text-[#13201C] dark:text-[#ECF2EF] tabular-nums mt-0.5">
                {formatBytes(totalBytes)}
              </p>
            </div>
            <div className="text-xs text-[#546660] dark:text-[#96ABA3] tabular-nums">
              {downloads.length} {lang === 'ar' ? 'ملفات' : 'surahs saved'}
            </div>
          </div>

          {/* Quick Download Form */}
          <div className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-4 space-y-3">
            <h3 className="text-sm font-semibold">{t.library.downloadSurah}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <select
                value={dlSurahNum}
                onChange={(e) => setDlSurahNum(Number(e.target.value))}
                aria-label="Surah to download"
                className="min-h-[44px] rounded-xl bg-[#F3F6F4] dark:bg-[#192823] px-3 text-xs font-medium"
              >
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.englishName} ({s.name})
                  </option>
                ))}
              </select>

              <select
                value={dlReciterId}
                onChange={(e) => setDlReciterId(e.target.value)}
                aria-label="Reciter to download"
                className="min-h-[44px] rounded-xl bg-[#F3F6F4] dark:bg-[#192823] px-3 text-xs font-medium"
              >
                {reciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {lang === 'ar' ? r.nameAr : r.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleStartDownload}
              className="md-ripple w-full min-h-[44px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>
                {downloadProgress[`${dlReciterId}_${dlSurahNum}`] !== undefined
                  ? `${t.library.downloading} ${downloadProgress[`${dlReciterId}_${dlSurahNum}`]}%`
                  : t.library.downloadSurah}
              </span>
            </button>
          </div>

          {/* Downloaded Files List */}
          {downloads.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-8 text-center">
              <p className="text-sm text-[#546660] dark:text-[#96ABA3]">{t.library.emptyDownloads}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {downloads.map((dl) => (
                <div
                  key={dl.key}
                  className="rounded-2xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-3.5 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => audioManager.playSurah(dl.surahNumber, dl.reciterId, 0)}
                    className="text-start flex-1 min-w-0 min-h-[44px]"
                  >
                    <p className="text-sm font-semibold truncate">
                      {dl.surahNumber}. {dl.surahNameEn} · {dl.surahNameAr}
                    </p>
                    <p className="text-xs text-[#546660] dark:text-[#96ABA3] truncate tabular-nums">
                      {lang === 'ar' ? dl.reciterNameAr : dl.reciterNameEn} · {formatBytes(dl.sizeBytes)}
                    </p>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => audioManager.playSurah(dl.surahNumber, dl.reciterId, 0)}
                      aria-label="Play offline"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#EDF3F0] dark:bg-[#1B2B25] text-[#0F5C4D] dark:text-[#4ECBA9]"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAudioDownload(dl.key);
                        await refreshDownloads();
                      }}
                      aria-label="Delete download"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
