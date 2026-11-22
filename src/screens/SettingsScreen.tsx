import {
  BookOpen,
  Info,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import React, {useState} from 'react';
import {PWAInstallButton} from '../components/PWAInstallButton';
import {APP_VERSION, TRANSLATIONS} from '../data/i18n';
import {TRANSLATION_OPTIONS} from '../data/recitersAndPlaylists';
import {clearAllOfflineCaches} from '../services/db';
import {useQuranStore} from '../store/useQuranStore';

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
  const lang = settings.language;
  const t = TRANSLATIONS[lang];

  const handleClearCache = async () => {
    await clearAllOfflineCaches();
    setDownloadedKeys([]);
    showToast(t.settings.cacheCleared);
  };

  return (
    <div className="space-y-6 pb-8 max-w-3xl">
      <h2 className="text-lg font-bold text-[#13201C] dark:text-[#ECF2EF]">{t.settings.title}</h2>

      {/* Install PWA Card */}
      <PWAInstallButton />

      {/* Appearance & Language */}
      <section className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-5 space-y-5">
        <h3 className="text-sm font-bold text-[#0F5C4D] dark:text-[#4ECBA9]">
          {t.settings.appearance}
        </h3>

        <div>
          <p className="text-xs font-medium text-[#546660] dark:text-[#96ABA3] mb-2">
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
                className={`min-h-[44px] rounded-2xl text-xs font-semibold transition-colors ${
                  settings.theme === opt.id
                    ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                    : 'bg-[#F3F6F4] dark:bg-[#192823] text-[#13201C] dark:text-[#DCE6E2]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[#546660] dark:text-[#96ABA3] mb-2">
            {t.settings.language}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateSettings({language: 'en'})}
              className={`min-h-[44px] rounded-2xl text-xs font-semibold ${
                lang === 'en'
                  ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                  : 'bg-[#F3F6F4] dark:bg-[#192823]'
              }`}
            >
              English (LTR)
            </button>
            <button
              type="button"
              onClick={() => updateSettings({language: 'ar'})}
              className={`min-h-[44px] rounded-2xl text-xs font-semibold ${
                lang === 'ar'
                  ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                  : 'bg-[#F3F6F4] dark:bg-[#192823]'
              }`}
            >
              العربية (RTL)
            </button>
          </div>
        </div>
      </section>

      {/* Reading & Audio */}
      <section className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-5 space-y-5">
        <h3 className="text-sm font-bold text-[#0F5C4D] dark:text-[#4ECBA9]">
          {t.settings.reading}
        </h3>

        <div>
          <div className="flex justify-between text-xs font-medium text-[#546660] dark:text-[#96ABA3] mb-2">
            <span>{t.settings.fontSize}</span>
            <span className="tabular-nums">{settings.arabicFontSize}px</span>
          </div>
          <input
            type="range"
            min={22}
            max={44}
            value={settings.arabicFontSize}
            onChange={(e) => updateSettings({arabicFontSize: Number(e.target.value)})}
            className="w-full md-slider bg-black/15 dark:bg-white/15"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-[#546660] dark:text-[#96ABA3] mb-2">
            {t.settings.arabicFont}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateSettings({arabicFont: 'amiri'})}
              className={`min-h-[44px] rounded-2xl text-xs font-semibold ${
                settings.arabicFont === 'amiri'
                  ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                  : 'bg-[#F3F6F4] dark:bg-[#192823]'
              }`}
            >
              Amiri Quran
            </button>
            <button
              type="button"
              onClick={() => updateSettings({arabicFont: 'scheherazade'})}
              className={`min-h-[44px] rounded-2xl text-xs font-semibold ${
                settings.arabicFont === 'scheherazade'
                  ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                  : 'bg-[#F3F6F4] dark:bg-[#192823]'
              }`}
            >
              Scheherazade New
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#546660] dark:text-[#96ABA3] mb-1.5">
              {t.settings.defaultReciter}
            </label>
            <select
              value={settings.defaultReciterId}
              onChange={(e) => updateSettings({defaultReciterId: e.target.value})}
              className="w-full min-h-[44px] rounded-2xl bg-[#F3F6F4] dark:bg-[#192823] px-3 text-xs font-medium"
            >
              {reciters.map((r) => (
                <option key={r.id} value={r.id}>
                  {lang === 'ar' ? r.nameAr : r.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#546660] dark:text-[#96ABA3] mb-1.5">
              {t.settings.translation}
            </label>
            <select
              value={settings.translationEdition}
              onChange={(e) => updateSettings({translationEdition: e.target.value})}
              className="w-full min-h-[44px] rounded-2xl bg-[#F3F6F4] dark:bg-[#192823] px-3 text-xs font-medium"
            >
              {TRANSLATION_OPTIONS.map((opt) => (
                <option key={opt.edition} value={opt.edition}>
                  {opt.language} — {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[#546660] dark:text-[#96ABA3] mb-2">
            {t.settings.audioQuality}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateSettings({audioQuality: 'high'})}
              className={`min-h-[44px] px-3 rounded-2xl text-xs font-semibold ${
                settings.audioQuality === 'high'
                  ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                  : 'bg-[#F3F6F4] dark:bg-[#192823]'
              }`}
            >
              {t.settings.high}
            </button>
            <button
              type="button"
              onClick={() => updateSettings({audioQuality: 'standard'})}
              className={`min-h-[44px] px-3 rounded-2xl text-xs font-semibold ${
                settings.audioQuality === 'standard'
                  ? 'bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15]'
                  : 'bg-[#F3F6F4] dark:bg-[#192823]'
              }`}
            >
              {t.settings.standard}
            </button>
          </div>
        </div>
      </section>

      {/* Storage & Info Links */}
      <section className="rounded-3xl bg-white dark:bg-[#131F1C] border border-black/8 dark:border-white/10 p-3 divide-y divide-black/6 dark:divide-white/8">
        <button
          type="button"
          onClick={handleClearCache}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-black/3 dark:hover:bg-white/4 rounded-xl"
        >
          <span className="flex items-center gap-3">
            <Trash2 className="w-4 h-4" />
            <span>{t.settings.clearCache}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenWhatsNew}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium hover:bg-black/3 dark:hover:bg-white/4 rounded-xl"
        >
          <span className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#C69749]" />
            <span>{t.settings.whatsNew}</span>
          </span>
          <span className="text-xs text-[#546660] tabular-nums">{APP_VERSION}</span>
        </button>

        <button
          type="button"
          onClick={resetOnboarding}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium hover:bg-black/3 dark:hover:bg-white/4 rounded-xl"
        >
          <span className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-[#0F5C4D] dark:text-[#4ECBA9]" />
            <span>{t.settings.replayOnboarding}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setInfoModal('about')}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium hover:bg-black/3 dark:hover:bg-white/4 rounded-xl"
        >
          <span className="flex items-center gap-3">
            <Info className="w-4 h-4 text-[#0F5C4D] dark:text-[#4ECBA9]" />
            <span>{t.settings.about}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setInfoModal('contact')}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium hover:bg-black/3 dark:hover:bg-white/4 rounded-xl"
        >
          <span className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-[#0F5C4D] dark:text-[#4ECBA9]" />
            <span>{t.settings.contact}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setInfoModal('privacy')}
          className="w-full flex items-center justify-between px-3 min-h-[52px] text-start text-sm font-medium hover:bg-black/3 dark:hover:bg-white/4 rounded-xl"
        >
          <span className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-[#0F5C4D] dark:text-[#4ECBA9]" />
            <span>{t.settings.privacy}</span>
          </span>
        </button>
      </section>

      {/* Info Modal */}
      {infoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={() => setInfoModal(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#131F1C] p-6 shadow-2xl border border-black/8 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold">
                {infoModal === 'about'
                  ? t.settings.about
                  : infoModal === 'contact'
                  ? t.settings.contact
                  : t.settings.privacy}
              </h3>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-[#43544E] dark:text-[#B4C6BF] leading-relaxed space-y-2.5">
              {infoModal === 'about' && (
                <>
                  <p>
                    {lang === 'ar'
                      ? 'قرآنفاي هو مشغل صوتي وقارئ للقرآن الكريم مجاني بالكامل (١٠٠٪) مصمم للدراسة والعمل والنوم، بدون إعلانات أو اشتراكات أو تسجيل دخول.'
                      : 'Quranfy is a 100% free Quran audio player and reader designed for calm study, work, and sleep—with zero ads, zero subscriptions, and no account required.'}
                  </p>
                  <p className="text-xs text-[#546660]">
                    {lang === 'ar'
                      ? 'مصادر البيانات العامة: AlQuran.cloud و MP3Quran.net و EveryAyah.com.'
                      : 'Public open data sources: AlQuran.cloud, MP3Quran.net, and EveryAyah.com.'}
                  </p>
                </>
              )}
              {infoModal === 'contact' && (
                <>
                  <p>
                    {lang === 'ar'
                      ? 'نرحب باقتراحاتكم وملاحظاتكم لتحسين تجربة التلاوة والقراءة.'
                      : 'Questions, reciter requests, or accessibility feedback are always welcome.'}
                  </p>
                  <p className="font-semibold text-[#0F5C4D] dark:text-[#4ECBA9]">
                    support@quranfy.app
                  </p>
                </>
              )}
              {infoModal === 'privacy' && (
                <>
                  <p>
                    {lang === 'ar'
                      ? 'لا يجمع تطبيق قرآنفاي أي بيانات شخصية أو تحليلات أو ملفات تتبع. يتم حفظ المفضلة والقوائم والملفات المحملة وسجل الاستماع محلياً على جهازك فقط.'
                      : 'Quranfy collects zero personal data, zero analytics, and zero tracking cookies. Your favorites, playlists, listening streaks, and offline downloads stay strictly on your device.'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
