import {BookOpen, CheckCircle2, Headphones, Sparkles, X} from 'lucide-react';
import React, {useState} from 'react';
import {APP_VERSION, pickLang, TRANSLATIONS} from '../data/i18n';
import {useQuranStore} from '../store/useQuranStore';
import {BrandLogo} from './BrandLogo';

export const OnboardingModal: React.FC = () => {
  const hasCompletedOnboarding = useQuranStore((s) => s.hasCompletedOnboarding);
  const completeOnboarding = useQuranStore((s) => s.completeOnboarding);
  const lang = useQuranStore((s) => s.settings.language);
  const updateSettings = useQuranStore((s) => s.updateSettings);
  const [step, setStep] = useState(0);

  if (hasCompletedOnboarding) return null;

  const t = TRANSLATIONS[lang];
  const steps = [
    {
      icon: Headphones,
      title: t.onboarding.step1Title,
      body: t.onboarding.step1Body,
    },
    {
      icon: BookOpen,
      title: t.onboarding.step2Title,
      body: t.onboarding.step2Body,
    },
    {
      icon: CheckCircle2,
      title: t.onboarding.step3Title,
      body: t.onboarding.step3Body,
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/65 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Quranfy"
    >
      <div className="w-full max-w-md rounded-3xl glass-strong p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="w-9 h-9" />
            <span className="font-display font-bold text-base text-ink dark:text-ink-dark">
              {t.appName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                updateSettings({
                  language: lang === 'en' ? 'ar' : lang === 'ar' ? 'bn' : 'en',
                })
              }
              className="px-3.5 min-h-[40px] rounded-xl bg-brand-600/12 dark:bg-white/10 text-xs font-semibold text-brand-700 dark:text-accent"
            >
              {lang === 'en' ? 'العربية' : lang === 'ar' ? 'বাংলা' : 'English'}
            </button>
            <button
              type="button"
              onClick={completeOnboarding}
              className="px-3 min-h-[40px] text-xs font-semibold text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark"
            >
              {t.onboarding.skip}
            </button>
          </div>
        </div>

        <div className="py-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-brand-600/14 dark:bg-accent/18 text-brand-600 dark:text-accent flex items-center justify-center mx-auto mb-5">
            <Icon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-ink dark:text-ink-dark leading-snug">
            {current.title}
          </h2>
          <p className="mt-3 text-sm text-muted dark:text-muted-dark leading-relaxed">
            {current.body}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 my-5">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Step ${idx + 1}`}
              onClick={() => setStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === step
                  ? 'w-6 bg-brand-600 dark:bg-accent'
                  : 'w-2 bg-brand-900/20 dark:bg-white/25'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            if (step < steps.length - 1) {
              setStep(step + 1);
            } else {
              completeOnboarding();
            }
          }}
          className="md-ripple w-full min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-sm font-semibold shadow-sm"
        >
          {step < steps.length - 1 ? t.onboarding.next : t.onboarding.getStarted}
        </button>
      </div>
    </div>
  );
};

interface WhatsNewModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({forceOpen = false, onClose}) => {
  const hasCompletedOnboarding = useQuranStore((s) => s.hasCompletedOnboarding);
  const lastSeenVersion = useQuranStore((s) => s.lastSeenVersion);
  const markVersionSeen = useQuranStore((s) => s.markVersionSeen);
  const lang = useQuranStore((s) => s.settings.language);

  const autoOpen = hasCompletedOnboarding && lastSeenVersion !== '' && lastSeenVersion !== APP_VERSION;
  const open = forceOpen || autoOpen;

  if (!open) return null;

  const handleClose = () => {
    markVersionSeen();
    onClose?.();
  };

  const highlights =
    lang === 'ar'
      ? [
          'إضافة تفسير الآيات بالإنجليزية والبنغالية مباشرة داخل القارئ مع الحفظ للعمل دون إنترنت',
          'إضافة الترجمة البنغالية للقرآن الكريم (محيي الدين خان) وإمكانية عرض العربية والإنجليزية والبنغالية معاً',
          'قسم الحديث الشريف الجديد مع الكتب السبعة، البحث بالرقم والكلمات، والوضع دون إنترنت',
          'الاستماع للأحاديث عبر محرك تحويل النص إلى كلام (TTS) بالعربية والإنجليزية والبنغالية',
        ]
      : lang === 'bn'
      ? [
          'রিডারে প্রতিটি আয়াতের ইংরেজি ও বাংলা তাফসীর (অফলাইন ক্যাশসহ)',
          'বাংলা কুরআন অনুবাদ (মুহিউদ্দীন খান) এবং আরবি, ইংরেজি ও বাংলা একসাথে দেখার সুবিধা',
          'নতুন হাদিস সেকশন: ৭টি হাদিস গ্রন্থ, নম্বর ও শব্দ অনুসন্ধান এবং অফলাইন সেভিং',
          'আরবি, ইংরেজি ও বাংলায় টেক্সট-টু-স্পিচ (TTS) দিয়ে হাদিস শোনার সুবিধা',
        ]
      : [
          'Per-ayah Quran Tafsir in English & Bangla (Quran.com v4) cached offline in IndexedDB',
          'Bangla Quran translation (Muhiuddin Khan) alongside Arabic & English in any combination',
          'New Hadith tab with 7 collections, book navigation, number/keyword search & favorites',
          'Text-to-speech Hadith listening in Arabic, English & Bangla with speed & auto-next',
        ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/65 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="What's New"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-3xl glass-strong p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-accent/20 text-accent-600 dark:text-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink dark:text-ink-dark">
                {pickLang(lang, "What's New in Quranfy", 'ما الجديد في قرآنفاي', 'কুরআনফাইয়ের নতুন ফিচার')}
              </h2>
              <p className="text-xs text-muted dark:text-muted-dark">
                {pickLang(lang, `Release ${APP_VERSION}`, `الإصدار ${APP_VERSION}`, `সংস্করণ ${APP_VERSION}`)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-brand-500/10 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="space-y-3 my-4">
          {highlights.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-ink dark:text-ink-dark">
              <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-accent shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleClose}
          className="md-ripple w-full min-h-[48px] rounded-2xl bg-brand-600 text-white dark:bg-accent dark:text-brand-950 text-sm font-semibold mt-2"
        >
          {pickLang(lang, 'Continue', 'متابعة', 'চালিয়ে যান')}
        </button>
      </div>
    </div>
  );
};
