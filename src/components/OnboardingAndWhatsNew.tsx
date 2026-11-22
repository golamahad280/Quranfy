import {BookOpen, CheckCircle2, Headphones, Sparkles, X} from 'lucide-react';
import React, {useState} from 'react';
import {APP_VERSION, TRANSLATIONS} from '../data/i18n';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Quranfy"
    >
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#131F1C] p-6 sm:p-8 shadow-2xl border border-black/8 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="w-8 h-8" />
            <span className="font-display font-bold text-base">{t.appName}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateSettings({language: lang === 'en' ? 'ar' : 'en'})}
              className="px-3 min-h-[36px] rounded-xl bg-[#EDF3F0] dark:bg-[#1C2D27] text-xs font-semibold text-[#0F5C4D] dark:text-[#4ECBA9]"
            >
              {lang === 'en' ? 'العربية' : 'English'}
            </button>
            <button
              type="button"
              onClick={completeOnboarding}
              className="px-3 min-h-[36px] text-xs font-medium text-[#546660] dark:text-[#96ABA3] hover:text-[#13201C]"
            >
              {t.onboarding.skip}
            </button>
          </div>
        </div>

        <div className="py-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#0F5C4D]/10 dark:bg-[#4ECBA9]/15 text-[#0F5C4D] dark:text-[#4ECBA9] flex items-center justify-center mx-auto mb-5">
            <Icon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#13201C] dark:text-[#ECF2EF] leading-snug">
            {current.title}
          </h2>
          <p className="mt-3 text-sm text-[#43544E] dark:text-[#A4B7B0] leading-relaxed">
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
                  ? 'w-6 bg-[#0F5C4D] dark:bg-[#4ECBA9]'
                  : 'w-2 bg-black/15 dark:bg-white/20'
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
          className="md-ripple w-full min-h-[48px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-sm font-semibold"
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
          'أوضاع الدراسة والعمل والنوم مع مازج أصوات طبيعية يعمل دون إنترنت',
          'الاستماع آية بآية مع تكرار الآية أو نطاق آيات والتمرير التلقائي',
          'التحميل المجاني دون إنترنت لجميع السور مع حفظ التقدم والروتين اليومي',
          'تبديل كامل بين العربية (RTL) والإنجليزية والمظهر الداكن التلقائي',
        ]
      : [
          'Study, Work, and Sleep focus modes with offline ambient sound mixer',
          'Synced Ayah-by-Ayah reader with per-ayah repeat & range looping',
          '100% free offline surah downloads stored privately on your device',
          'Listening habit tracker, daily streaks, and local Android reminders',
        ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="What's New"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#131F1C] p-6 shadow-2xl border border-black/8 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#C69749]/15 text-[#C69749] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {lang === 'ar' ? 'ما الجديد في قرآنفاي' : "What's New in Quranfy"}
              </h2>
              <p className="text-xs text-[#546660] dark:text-[#96ABA3]">
                {lang === 'ar' ? `الإصدار ${APP_VERSION}` : `Release ${APP_VERSION}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="space-y-3 my-4">
          {highlights.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[#283833] dark:text-[#DCE6E2]">
              <CheckCircle2 className="w-4 h-4 text-[#0F5C4D] dark:text-[#4ECBA9] shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleClose}
          className="md-ripple w-full min-h-[46px] rounded-2xl bg-[#0F5C4D] text-white dark:bg-[#4ECBA9] dark:text-[#081A15] text-sm font-semibold mt-2"
        >
          {lang === 'ar' ? 'متابعة' : 'Continue'}
        </button>
      </div>
    </div>
  );
};
