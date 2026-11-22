import {Bookmark, BookOpen, Image as ImageIcon, NotebookPen, Trash2} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import {pickLang} from '../data/i18n';
import {useQuranStore} from '../store/useQuranStore';

type SubTab = 'bookmarks' | 'ayah-notes' | 'hadith-notes';

export const BookmarksNotesScreen: React.FC = () => {
  const lang = useQuranStore((s) => s.settings.language);
  const surahs = useQuranStore((s) => s.surahs);
  const bookmarkedAyahs = useQuranStore((s) => s.bookmarkedAyahs);
  const ayahNotes = useQuranStore((s) => s.ayahNotes);
  const hadithNotes = useQuranStore((s) => s.hadithNotes);

  const toggleBookmarkedAyah = useQuranStore((s) => s.toggleBookmarkedAyah);
  const setAyahNote = useQuranStore((s) => s.setAyahNote);
  const setHadithNote = useQuranStore((s) => s.setHadithNote);
  const openReader = useQuranStore((s) => s.openReader);
  const openShareImageModal = useQuranStore((s) => s.openShareImageModal);
  const setActiveTab = useQuranStore((s) => s.setActiveTab);

  const [subTab, setSubTab] = useState<SubTab>('bookmarks');

  const ayahNoteEntries = useMemo(() => Object.entries(ayahNotes), [ayahNotes]);
  const hadithNoteEntries = useMemo(() => Object.entries(hadithNotes), [hadithNotes]);

  return (
    <div className="space-y-5 pb-8 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-ink dark:text-ink-dark">
          {pickLang(lang, 'Bookmarks & Notes', 'العلامات والملاحظات', 'বুকমার্ক ও নোটস')}
        </h2>
        <p className="text-xs text-muted dark:text-muted-dark">
          {pickLang(
            lang,
            'Jump back to bookmarked ayahs, review your notes, or render shareable cards',
            'ارجع إلى الآيات المرجعية وملاحظاتك وأنشئ بطاقات مشاركة',
            'বুকমার্ক করা আয়াত ও আপনার ব্যক্তিগত নোটসমূহ পরিচালনা করুন'
          )}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl glass">
        {(
          [
            {
              id: 'bookmarks',
              label: `${pickLang(lang, 'Bookmarks', 'العلامات', 'বুকমার্ক')} (${bookmarkedAyahs.length})`,
            },
            {
              id: 'ayah-notes',
              label: `${pickLang(lang, 'Ayah Notes', 'ملاحظات الآيات', 'আয়াত নোট')} (${ayahNoteEntries.length})`,
            },
            {
              id: 'hadith-notes',
              label: `${pickLang(lang, 'Hadith Notes', 'ملاحظات الحديث', 'হাদিস নোট')} (${hadithNoteEntries.length})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`min-h-[44px] rounded-xl text-xs font-semibold transition-colors px-2 truncate ${
              subTab === tab.id
                ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                : 'text-muted dark:text-muted-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookmarked Ayahs */}
      {subTab === 'bookmarks' && (
        <div className="space-y-3">
          {bookmarkedAyahs.length === 0 ? (
            <div className="rounded-3xl glass p-8 text-center text-sm text-muted dark:text-muted-dark">
              {pickLang(
                lang,
                'No bookmarked ayahs yet. Tap the bookmark button on any ayah inside Reader.',
                'لا توجد آيات مرجعية بعد. اضغط على أيقونة العلامة المرجعية في المصحف.',
                'এখনো কোনো আয়াত বুকমার্ক করা হয়নি। রিডারে গিয়ে বুকমার্ক আইকনে ট্যাপ করুন।'
              )}
            </div>
          ) : (
            bookmarkedAyahs.map((bm) => (
              <div key={bm.id} className="rounded-3xl glass p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openReader(bm.surahNumber, bm.ayahNumber)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-brand-700 dark:text-accent min-h-[40px]"
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                    <span>
                      {bm.surahNameEn} ({bm.surahNameAr}) · {bm.surahNumber}:{bm.ayahNumber}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        openShareImageModal({
                          surahNameEn: bm.surahNameEn,
                          surahNameAr: bm.surahNameAr,
                          surahNumber: bm.surahNumber,
                          ayahNumber: bm.ayahNumber,
                          arabicText: bm.arabicText,
                          translationText: bm.translationText,
                        })
                      }
                      aria-label="Share as image"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-brand-500/10 dark:hover:bg-white/10"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openReader(bm.surahNumber, bm.ayahNumber)}
                      aria-label="Open in Reader"
                      className="min-h-[44px] px-3 rounded-2xl glass text-xs font-semibold flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{pickLang(lang, 'Read', 'قراءة', 'পড়ুন')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBookmarkedAyah(bm)}
                      aria-label="Remove bookmark"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p dir="rtl" className="font-quran-amiri text-xl text-right leading-loose">
                  {bm.arabicText}
                </p>
                {bm.translationText && (
                  <p className="text-xs text-muted dark:text-muted-dark leading-relaxed">
                    {bm.translationText}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Ayah Notes */}
      {subTab === 'ayah-notes' && (
        <div className="space-y-3">
          {ayahNoteEntries.length === 0 ? (
            <div className="rounded-3xl glass p-8 text-center text-sm text-muted dark:text-muted-dark">
              {pickLang(
                lang,
                'No ayah notes saved yet.',
                'لا توجد ملاحظات على الآيات بعد.',
                'এখনো কোনো আয়াত নোট সংরক্ষণ করা হয়নি।'
              )}
            </div>
          ) : (
            ayahNoteEntries.map(([key, noteText]) => {
              const [surahStr, ayahStr] = key.split(':');
              const surahNumber = Number(surahStr);
              const ayahNumber = Number(ayahStr);
              const surah = surahs.find((s) => s.number === surahNumber);
              return (
                <div key={key} className="rounded-3xl glass p-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openReader(surahNumber, ayahNumber)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-brand-700 dark:text-accent min-h-[40px]"
                    >
                      <NotebookPen className="w-4 h-4" />
                      <span>
                        {surah ? `${surah.englishName} (${surah.name})` : `Surah ${surahNumber}`} ·{' '}
                        {key}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAyahNote(surahNumber, ayahNumber, '')}
                      aria-label="Delete note"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={noteText}
                    onChange={(e) => setAyahNote(surahNumber, ayahNumber, e.target.value)}
                    className="w-full rounded-2xl glass px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-accent"
                  />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Hadith Notes */}
      {subTab === 'hadith-notes' && (
        <div className="space-y-3">
          {hadithNoteEntries.length === 0 ? (
            <div className="rounded-3xl glass p-8 text-center text-sm text-muted dark:text-muted-dark">
              {pickLang(
                lang,
                'No hadith notes saved yet.',
                'لا توجد ملاحظات على الأحاديث بعد.',
                'এখনো কোনো হাদিস নোট সংরক্ষণ করা হয়নি।'
              )}
            </div>
          ) : (
            hadithNoteEntries.map(([id, noteText]) => (
              <div key={id} className="rounded-3xl glass p-5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('hadith')}
                    className="inline-flex items-center gap-2 text-xs font-bold text-brand-700 dark:text-accent uppercase min-h-[40px]"
                  >
                    <NotebookPen className="w-4 h-4" />
                    <span>{id.replace(':', ' #')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHadithNote(id, '')}
                    aria-label="Delete hadith note"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setHadithNote(id, e.target.value)}
                  className="w-full rounded-2xl glass px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-accent"
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
export default BookmarksNotesScreen;
