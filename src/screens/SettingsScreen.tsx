import {BookOpen, Info, Mail, ShieldCheck, Sparkles, Trash2, X} from 'lucide-react';
import React, {useEffect, useMemo, useState} from 'react';
import {PWAInstallButton} from '../components/PWAInstallButton';
import {APP_VERSION, pickLang, TRANSLATIONS} from '../data/i18n';
import {TRANSLATION_OPTIONS} from '../data/recitersAndPlaylists';
import {clearAllOfflineCaches} from '../services/db';
import {
  fetchAvailableTafsirs,
  groupTafsirsByLanguage,
  resolvePreferredTafsirId,
} from '../services/tafsirApi';
import {useQuranStore} from '../store/useQuranStore';
import {TafsirResource} from '../types/quran';

interface SettingsScreenProps {
  onOpenWhatsNew: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({onOpenWhatsNew}) => {
  const settings = useQuranStore((s) => s.settings);
  const reciters = useQuranStore((s) => s.reciters);
  const updateSettings = useQuranStore((s) => s.updateSettings);
  const resetOnboarding = useQuranStore((s) => s.resetOnboarding);
  const setDownloadedKeys = useQuranStore((s) => s.setDownloadedKeys);
  const showToast = useQuranStore((s) => s.showToast);

  const [infoModal, setInfoModal] = useState<'about' | 'contact' | 'privacy' | null>(null);
  const [tafsirs, setTafsirs] = useState<TafsirResource[]>([]);

  const lang = settings.language;
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    let active = true;
    fetchAvailableTafsirs()
      .then((list) => {
        if (active) setTafsirs(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const groupedTafsirs = useMemo(() => groupTafsirsByLanguage(tafsirs), [tafsirs]);
  const activeTafsirId = useMemo(
    () => resolvePreferredTafsirId(tafsirs, settings.selectedTafsirId, lang),
    [tafsirs, settings.selectedTafsirId, lang]
  );

  const handleClearCache = async () => {
    await clearAllOfflineCaches();
    setDownloadedKeys([]);
    showToast(t.settings.cacheCleared);
  };

  return (
    <div className="space-y-6 pb-8 max-w-3xl">
      <h2 className="text-lg font-bold text-ink dark:text-ink-dark">{t.settings.title}</h2>

      {/* Install PWA Card */}
      <PWAInstallButton />

      {/* Appearance & Language */}
      <section className="rounded-3xl glass p-5 space-y-5">
        <h3 className="text-sm font-bold text-brand-700 dark:text-accent">
          {t.settings.appearance}
        </h3>

        <div>
          <p className="text-xs font-medium text-muted dark:text-muted-dark mb-2">
            {t.settings.theme}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                {id: 'light', label: t.settings.light},
                {id: 'dark', label: t.settings.dark},
                {id: 'auto', label: t.settings.auto},
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateSettings({theme: opt.id})}
                className={`md-ripple min-h-[48px] rounded-2xl text-xs font-semibold transition-colors ${
                  settings.theme === opt.id
                    ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                    : 'glass text-ink dark:text-ink-dark'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted dark:text-muted-dark mb-2">
            {t.settings.language}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => updateSettings({language: 'en'})}
              className={`md-ripple min-h-[48px] rounded-2xl text-xs font-semibold ${
                lang === 'en'
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'glass text-ink dark:text-ink-dark'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => updateSettings({language: 'ar'})}
              className={`md-ripple min-h-[48px] rounded-2xl text-xs font-semibold ${
                lang === 'ar'
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'glass text-ink dark:text-ink-dark'
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => updateSettings({language: 'bn'})}
              className={`md-ripple min-h-[48px] rounded-2xl text-xs font-semibold font-bengali ${
                lang === 'bn'
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'glass text-ink dark:text-ink-dark'
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>
      </section>

      {/* Reading, Tafsir & Audio */}
      <section className="rounded-3xl glass p-5 space-y-5">
        <h3 className="text-sm font-bold text-brand-700 dark:text-accent">{t.settings.reading}</h3>

        <div>
          <div className="flex justify-between text-xs font-medium text-muted dark:text-muted-dark mb-2">
            <span>{t.settings.fontSize}</span>
            <span className="tabular-nums">{settings.arabicFontSize}px</span>
          </div>
          <input
            type="range"
            min={22}
            max={44}
            value={settings.arabicFontSize}
            onChange={(e) => updateSettings({arabicFontSize: Number(e.target.value)})}
            className="w-full md-slider bg-brand-900/15 dark:bg-white/20"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-muted dark:text-muted-dark mb-2">
            {t.settings.arabicFont}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateSettings({arabicFont: 'amiri'})}
              className={`md-ripple min-h-[48px] rounded-2xl text-xs font-semibold ${
                settings.arabicFont === 'amiri'
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'glass text-ink dark:text-ink-dark'
              }`}
            >
              Amiri Quran
            </button>
            <button
              type="button"
              onClick={() => updateSettings({arabicFont: 'scheherazade'})}
              className={`md-ripple min-h-[48px] rounded-2xl text-xs font-semibold ${
                settings.arabicFont === 'scheherazade'
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'glass text-ink dark:text-ink-dark'
              }`}
            >
              Scheherazade New
            </button>
          </div>
        </div>

        {/* Bangla Quran translation toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-medium cursor-pointer min-h-[44px] font-bengali">
            <input
              type="checkbox"
              checked={settings.showBanglaTranslation}
              onChange={(e) => updateSettings({showBanglaTranslation: e.target.checked})}
              className="w-4 h-4 accent-brand-600 dark:accent-accent"
            />
            <span>{t.settings.showBangla}</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-medium cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={settings.showTranslation}
              onChange={(e) => updateSettings({showTranslation: e.target.checked})}
              className="w-4 h-4 accent-brand-600 dark:accent-accent"
            />
            <span>{t.settings.showTranslation}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted dark:text-muted-dark mb-1.5">
              {t.settings.defaultReciter}
            </label>
            <select
              value={settings.defaultReciterId}
              onChange={(e) => updateSettings({defaultReciterId: e.target.value})}
              className="w-full min-h-[48px] rounded-2xl glass px-3 text-xs font-medium"
            >
              {reciters.map((r) => (
                <option key={r.id} value={r.id} className="bg-surface-light dark:bg-surface-dark">
                  {lang === 'ar' ? r.nameAr : r.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted dark:text-muted-dark mb-1.5">
              {t.settings.translation}
            </label>
            <select
              value={settings.translationEdition}
              onChange={(e) => updateSettings({translationEdition: e.target.value})}
              className="w-full min-h-[48px] rounded-2xl glass px-3 text-xs font-medium"
            >
              {TRANSLATION_OPTIONS.map((opt) => (
                <option
                  key={opt.edition}
                  value={opt.edition}
                  className="bg-surface-light dark:bg-surface-dark"
                >
                  {opt.language} — {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preferred Tafsir selector */}
        {tafsirs.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-muted dark:text-muted-dark mb-1.5">
              {t.settings.tafsirChoice}
            </label>
            <select
              value={activeTafsirId ?? ''}
              onChange={(e) => updateSettings({selectedTafsirId: Number(e.target.value)})}
              className="w-full min-h-[48px] rounded-2xl glass px-3 text-xs font-medium"
            >
              {groupedTafsirs.english.length > 0 && (
                <optgroup label={t.tafsir.englishGroup}>
                  {groupedTafsirs.english.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      className="bg-surface-light dark:bg-surface-dark"
                    >
                      {item.name} — {item.author_name}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedTafsirs.bangla.length > 0 && (
                <optgroup label={t.tafsir.banglaGroup}>
                  {groupedTafsirs.bangla.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      className="bg-surface-light dark:bg-surface-dark"
                    >
                      {item.translated_name?.name || item.name} — {item.author_name}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedTafsirs.others.length > 0 && (
                <optgroup label={t.tafsir.otherGroup}>
                  {groupedTafsirs.others.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      className="bg-surface-light dark:bg-surface-dark"
                    >
                      [{item.language_name}] {item.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-muted dark:text-muted-dark mb-2">
            {t.settings.audioQuality}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateSettings({audioQuality: 'high'})}
              className={`md-ripple min-h-[48px] px-3 rounded-2xl text-xs font-semibold ${
                settings.audioQuality === 'high'
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'glass text-ink dark:text-ink-dark'
              }`}
            >
              {t.settings.high}
            </button>
            <button
              type="button"
              onClick={() => updateSettings({audioQuality: 'standard'})}
              className={`md-ripple min-h-[48px] px-3 rounded-2xl text-xs font-semibold ${
                settings.audioQuality === 'standard'
                  ? 'bg-brand-600 text-white dark:bg-accent dark:text-brand-950 shadow-sm'
                  : 'glass text-ink dark:text-ink-dark'
              }`}
            >
              {t.settings.standard}
            </button>
          </div>
        </div>
      </section>

      {/* Storage & Info Links */}
      <section className="rounded-3xl glass p-3 divide-y divide-brand-500/10 dark:divide-white/10">
        <button
          type="button"
          onClick={handleClearCache}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/8 rounded-2xl"
        >
          <span className="flex items-center gap-3">
            <Trash2 className="w-4 h-4" />
            <span>{t.settings.clearCache}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenWhatsNew}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium hover:bg-brand-500/6 dark:hover:bg-white/6 rounded-2xl"
        >
          <span className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-accent-500 dark:text-accent" />
            <span>{t.settings.whatsNew}</span>
          </span>
          <span className="text-xs text-muted dark:text-muted-dark tabular-nums">{APP_VERSION}</span>
        </button>

        <button
          type="button"
          onClick={resetOnboarding}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium hover:bg-brand-500/6 dark:hover:bg-white/6 rounded-2xl"
        >
          <span className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-brand-600 dark:text-accent" />
            <span>{t.settings.replayOnboarding}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setInfoModal('about')}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium hover:bg-brand-500/6 dark:hover:bg-white/6 rounded-2xl"
        >
          <span className="flex items-center gap-3">
            <Info className="w-4 h-4 text-brand-600 dark:text-accent" />
            <span>{t.settings.about}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setInfoModal('contact')}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium hover:bg-brand-500/6 dark:hover:bg-white/6 rounded-2xl"
        >
          <span className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-brand-600 dark:text-accent" />
            <span>{t.settings.contact}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setInfoModal('privacy')}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium hover:bg-brand-500/6 dark:hover:bg-white/6 rounded-2xl"
        >
          <span className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-accent" />
            <span>{t.settings.privacy}</span>
          </span>
        </button>
      </section>

      {/* Info Modal */}
      {infoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/60 backdrop-blur-sm p-4"
          onClick={() => setInfoModal(null)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl glass-strong p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-ink dark:text-ink-dark">
                {infoModal === 'about'
                  ? t.settings.about
                  : infoModal === 'contact'
                  ? t.settings.contact
                  : t.settings.privacy}
              </h3>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-muted dark:text-muted-dark leading-relaxed space-y-3">
              {infoModal === 'about' && (
                <>
                  <p>
                    {pickLang(
                      lang,
                      'Quranfy is a 100% free Quran audio player, Tafsir reader, and Hadith explorer designed for calm study, work, and sleep—with zero ads, zero subscriptions, and no account required.',
                      'قرآنفاي هو مشغل صوتي وقارئ للقرآن الكريم مع التفسير وموسوعة الحديث مجاني بالكامل (١٠٠٪) مصمم للدراسة والعمل والنوم، بدون إعلانات أو اشتراكات أو تسجيل دخول.',
                      'কুরআনফাই হলো পড়াশোনা, কাজ ও ঘুমের জন্য ১০০% বিনামূল্যে কুরআন অডিও প্লেয়ার, তাফসীর ও হাদিস সংকলন—কোনো বিজ্ঞাপন, সাবস্ক্রিপশন বা লগইন ছাড়াই।'
                    )}
                  </p>
                  <div className="rounded-2xl glass p-3.5 space-y-1.5 text-xs">
                    <p className="font-bold text-brand-700 dark:text-accent">
                      {pickLang(lang, 'Open Data Sources', 'مصادر البيانات المفتوحة', 'ওপেন ডেটা উৎস')}
                    </p>
                    <p>
                      • Quran text & search: <strong>AlQuran.cloud API</strong>
                    </p>
                    <p>
                      • Tafsir (EN / BN): <strong>Quran.com API v4</strong>
                    </p>
                    <p>
                      • Bangla Quran (Muhiuddin Khan): <strong>fawazahmed0/quran-api</strong>
                    </p>
                    <p>
                      • Hadith collections (AR / EN / BN): <strong>fawazahmed0/hadith-api</strong>
                    </p>
                    <p>
                      • Recitations: <strong>MP3Quran.net</strong> &amp; <strong>EveryAyah.com</strong>
                    </p>
                  </div>
                  <div className="rounded-2xl glass p-3.5 space-y-1 text-xs">
                    <p className="font-bold text-brand-700 dark:text-accent">
                      {pickLang(
                        lang,
                        'Hadith Sources & Reliability',
                        'مصادر الحديث والموثوقية',
                        'হাদিসের উৎস ও নির্ভরযোগ্যতা'
                      )}
                    </p>
                    <p>
                      {pickLang(
                        lang,
                        'Hadith texts and scholar grades (Sahih, Hasan, Da‘if when available) are loaded directly from fawazahmed0/hadith-api (sourced from Sunnah.com & established collections). Always verify rulings with qualified scholars. Hadith spoken playback uses your device Text-to-Speech engine rather than human recitation.',
                        'يتم جلب نصوص الأحاديث ودرجاتها (صحيح/حسن/ضعيف عند توفرها) من fawazahmed0/hadith-api. يُنصح بالرجوع إلى أهل العلم في الأحكام. الاستماع للأحاديث يعتمد على محرك تحويل النص إلى كلام في جهازك وليس تلاوة بشرية.',
                        'হাদিসের পাঠ ও মান (সহীহ, হাসান, যঈফ—উপলব্ধ থাকলে) fawazahmed0/hadith-api থেকে সংগৃহীত। শরয়ী মাসআলার জন্য আলেমদের পরামর্শ নিন। হাদিস শোনা আপনার ডিভাইসের টেক্সট-টু-স্পিচ ইঞ্জিন ব্যবহার করে, কোনো ক্বারি তিলাওয়াত নয়।'
                      )}
                    </p>
                  </div>
                </>
              )}
              {infoModal === 'contact' && (
                <>
                  <p>
                    {pickLang(
                      lang,
                      'Questions, reciter requests, or accessibility feedback are always welcome.',
                      'نرحب باقتراحاتكم وملاحظاتكم لتحسين تجربة التلاوة والقراءة.',
                      'যেকোনো প্রশ্ন, পরামর্শ বা মতামত আমাদের জানান।'
                    )}
                  </p>
                  <p className="font-semibold text-brand-700 dark:text-accent">
                    support@quranfy.app
                  </p>
                </>
              )}
              {infoModal === 'privacy' && (
                <p>
                  {pickLang(
                    lang,
                    'Quranfy collects zero personal data, zero analytics, and zero tracking cookies. Your favorites, playlists, listening streaks, Tafsir/Hadith caches, and offline downloads stay strictly on your device.',
                    'لا يجمع تطبيق قرآنفاي أي بيانات شخصية أو تحليلات أو ملفات تتبع. يتم حفظ المفضلة والقوائم والملفات المحملة وسجل الاستماع محلياً على جهازك فقط.',
                    'কুরআনফাই কোনো ব্যক্তিগত তথ্য, অ্যানালিটিক্স বা ট্র্যাকিং কুকি সংগ্রহ করে না। আপনার প্রিয় তালিকা, প্লেলিস্ট, অফলাইন ক্যাশ ও ডাউনলোড শুধুই আপনার ডিভাইসে সংরক্ষিত থাকে।'
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
