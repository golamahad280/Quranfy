import {
  BookOpen,
  Download,
  Info,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {PWAInstallButton} from '../components/PWAInstallButton';
import {APP_VERSION, pickLang, TRANSLATIONS} from '../data/i18n';
import {TRANSLATION_OPTIONS} from '../data/recitersAndPlaylists';
import {clearAllOfflineCaches} from '../services/db';
import {
  fetchAvailableTafsirs,
  groupTafsirsByLanguage,
  resolvePreferredTafsirId,
} from '../services/tafsirApi';
import {getTodayDateKey, useQuranStore} from '../store/useQuranStore';
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
  const exportBackupJson = useQuranStore((s) => s.exportBackupJson);
  const importBackupJson = useQuranStore((s) => s.importBackupJson);
  const showToast = useQuranStore((s) => s.showToast);

  const [infoModal, setInfoModal] = useState<'about' | 'contact' | 'privacy' | null>(null);
  const [tafsirs, setTafsirs] = useState<TafsirResource[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleExportBackup = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quranfy-backup-${getTodayDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(pickLang(lang, 'Backup exported as JSON', 'تم تصدير النسخة الاحتياطية', 'ব্যাকআপ ডাউনলোড হয়েছে'));
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const res = importBackupJson(text);
      if (res.ok) {
        showToast(
          pickLang(lang, 'Backup restored successfully', 'تمت استعادة البيانات بنجاح', 'ব্যাকআপ সফলভাবে পুনরুদ্ধার হয়েছে')
        );
      } else {
        showToast(res.error || 'Invalid backup file');
      }
    } catch {
      showToast('Failed to read backup file');
    }
  };

  return (
    <div className="space-y-6 pb-8 max-w-3xl">
      <h2 className="text-lg font-bold text-ink dark:text-ink-dark">{t.settings.title}</h2>

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

        {/* Experimental: device voice for English hadith */}
        <div className="pt-2 border-t border-brand-500/12 dark:border-white/10">
          <label className="flex items-start justify-between gap-3 cursor-pointer min-h-[48px]">
            <div className="flex items-start gap-2.5">
              <Volume2 className="w-4 h-4 text-brand-600 dark:text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-ink dark:text-ink-dark">
                  {t.settings.experimentalTtsTitle}
                </p>
                <p className="text-xs text-muted dark:text-muted-dark mt-0.5">
                  {t.settings.experimentalTtsDesc}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableExperimentalEnglishHadithTts}
              onChange={(e) =>
                updateSettings({enableExperimentalEnglishHadithTts: e.target.checked})
              }
              className="w-5 h-5 mt-0.5 accent-brand-600 dark:accent-accent shrink-0"
            />
          </label>
        </div>
      </section>

      {/* Backup & Restore */}
      <section className="rounded-3xl glass p-5 space-y-3">
        <h3 className="text-sm font-bold text-brand-700 dark:text-accent">
          {t.settings.backupTitle}
        </h3>
        <p className="text-xs text-muted dark:text-muted-dark">{t.settings.backupDesc}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            className="md-ripple min-h-[48px] px-4 rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{t.settings.exportBackup}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="md-ripple min-h-[48px] px-4 rounded-2xl glass text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>{t.settings.importBackup}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
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
                      'Quranfy is a 100% free Quran audio player, Tafsir reader, Hadith explorer, Prayer & Qibla, Adhkar, and Hifz companion—with zero ads, zero subscriptions, and no account required.',
                      'قرآنفاي هو تطبيق مجاني بالكامل (١٠٠٪) للاستماع إلى القرآن وتدبره مع التفسير والحديث والأذكار ومواقيت الصلاة والحفظ، بدون إعلانات أو اشتراكات.',
                      'কুরআনফাই ১০০% বিনামূল্যে কুরআন অডিও প্লেয়ার, তাফসীর, হাদিস, নামাজের সময়, আযকার ও হিফজ সহায়ক—বিজ্ঞাপন ও সাবস্ক্রিপশনমুক্ত।'
                    )}
                  </p>
                  <div className="rounded-2xl glass p-3.5 space-y-1.5 text-xs">
                    <p className="font-bold text-brand-700 dark:text-accent">
                      {pickLang(lang, 'Open Data Sources', 'مصادر البيانات المفتوحة', 'ওপেন ডেটা উৎস')}
                    </p>
                    <p>• Quran text &amp; search: <strong>AlQuran.cloud API</strong></p>
                    <p>• Tafsir (EN / BN): <strong>Quran.com API v4</strong></p>
                    <p>• Bangla Quran (Muhiuddin Khan): <strong>fawazahmed0/quran-api</strong></p>
                    <p>• Hadith collections: <strong>fawazahmed0/hadith-api</strong></p>
                    <p>• Prayer &amp; Qibla (Offline): <strong>adhan</strong></p>
                    <p>• Recitations: <strong>MP3Quran.net</strong> &amp; <strong>EveryAyah.com</strong></p>
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
                    'Quranfy collects zero personal data, zero analytics, and zero tracking cookies. Your bookmarks, notes, playlists, Khatam/Hifz progress, and offline downloads stay strictly on your device.',
                    'لا يجمع تطبيق قرآنفاي أي بيانات شخصية أو تحليلات أو ملفات تتبع. كل بياناتك تبقى محلياً على جهازك فقط.',
                    'কুরআনফাই কোনো ব্যক্তিগত তথ্য, অ্যানালিটিক্স বা ট্র্যাকিং কুকি সংগ্রহ করে না। আপনার সব তথ্য শুধুই আপনার ডিভাইসে থাকে।'
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
export default SettingsScreen;
